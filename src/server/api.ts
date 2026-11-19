import { z } from "zod";
import {
  generateInterviewQuestions,
  evaluateInterviewSession,
  type InterviewQuestion,
  type InterviewScorecard,
  type CandidateAnswerRecord,
} from "../lib/ai-interview";
import { validatePlan, detectLevel, type PlanContext } from "../lib/interview-planner";
import { computeComposite, aggregateScorecard, type RubricScores } from "../lib/scoring";

// Configurable model IDs and voices from environment
const LLM_MODEL_PRIMARY = process.env["LLM_MODEL_PRIMARY"] || "gemini-3.8-flash";
const LLM_MODEL_FALLBACK = process.env["LLM_MODEL_FALLBACK"] || "gpt-4o-mini";
const STT_MODEL = process.env["STT_MODEL"] || "gemini-3.8-flash";
const TTS_MODEL = process.env["TTS_MODEL"] || "tts-1";
const TTS_VOICE = process.env["TTS_VOICE"] || "onyx";

// Timeouts in milliseconds
const TIMEOUT_LLM = 25000;
const TIMEOUT_STT = 25000;
const TIMEOUT_TTS = 20000;

// Valid OpenAI voice IDs
const VALID_OPENAI_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);

function resolveOpenAiVoice(voiceCandidate?: string): string {
  if (voiceCandidate && VALID_OPENAI_VOICES.has(voiceCandidate.toLowerCase())) {
    return voiceCandidate.toLowerCase();
  }
  if (TTS_VOICE && VALID_OPENAI_VOICES.has(TTS_VOICE.toLowerCase())) {
    return TTS_VOICE.toLowerCase();
  }
  return "onyx";
}

// Multi-key helper to parse comma-separated GEMINI_API_KEY
function getGeminiApiKeys(): string[] {
  const raw = process.env["GEMINI_API_KEY"] || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

const CANDIDATE_GEMINI_MODELS = [
  LLM_MODEL_PRIMARY,
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];

// Retry helper with backoff on 429/5xx and response logging
async function fetchWithRetry(
  tag: string,
  url: string,
  options: RequestInit,
  timeoutMs: number,
  maxRetries = 1,
): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const bodySnippet = await response
          .clone()
          .text()
          .catch(() => "");
        console.warn(`[${tag}] status ${response.status}: ${bodySnippet.slice(0, 300)}`);
        // If daily quota exhausted or auth failure, do not retry
        if (
          response.status === 401 ||
          response.status === 403 ||
          bodySnippet.includes("RESOURCE_EXHAUSTED") ||
          bodySnippet.includes("quota")
        ) {
          return response;
        }
      }

      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
      }

      return response;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
      }
      console.warn(`[${tag}] network exception:`, err);
      throw err;
    }
  }
  throw new Error(`[${tag}] Request failed after retries`);
}

/* ========================================================================== */
/* 1. /api/interview/plan                                                     */
/* ========================================================================== */

export const PlanRequestSchema = z.object({
  jobTitle: z.string().min(1),
  jobPosting: z.record(z.unknown()).optional().default({}),
  jobId: z.string().optional(),
  company: z.string().optional(),
  resumeSummary: z.string().optional().default(""),
  projects: z.array(z.string()).optional().default([]),
  verificationQuestions: z.array(z.string()).optional().default([]),
  language: z.enum(["en", "hi", "hinglish"]).optional().default("en"),
  analysis: z
    .object({
      executive_summary: z.string().optional(),
      strengths: z
        .array(
          z.object({
            skill_or_area: z.string(),
            evidence_quote: z.string(),
          }),
        )
        .optional(),
      gaps: z
        .array(
          z.object({
            requirement: z.string(),
            type: z.enum(["mandatory", "preferred"]).optional(),
            severity: z.string().optional(),
          }),
        )
        .optional(),
      verification_questions: z.array(z.string()).optional(),
    })
    .optional(),
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;

const planCache = new Map<
  string,
  {
    timestamp: number;
    plan: {
      questions: InterviewQuestion[];
      modelUsed: string;
      source: "llm" | "template";
    };
  }
>();
const planInFlight = new Map<
  string,
  Promise<{
    questions: InterviewQuestion[];
    modelUsed: string;
    source: "llm" | "template";
  }>
>();

const LlmQuestionSchema = z.object({
  id: z.enum(["q1_intro", "q2_technical", "q3_architecture", "q4_scenario", "q5_closing"]),
  phase: z.enum(["intro", "technical", "architecture", "scenario", "closing"]),
  phaseLabel: z.string(),
  question: z.string(),
  contextHint: z.string(),
  expectedKeywords: z.array(z.string()),
  idealAnswerOutline: z.string(),
  groundedIn: z.string().optional(),
});

const LlmPlanSchema = z.object({
  questions: z.array(LlmQuestionSchema).length(5),
});

export async function handleInterviewPlan(payload: PlanRequest) {
  const analysisFingerprint = payload.analysis?.strengths?.[0]?.evidence_quote?.slice(0, 20) || "";
  const cacheKey = `${payload.jobId || ""}_${payload.jobTitle}_${payload.language}_${analysisFingerprint}_${(payload.verificationQuestions || []).join(",")}`;

  const cached = planCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 120_000) {
    console.log(`[interview/plan] Serving cached plan for ${payload.jobTitle}`);
    return cached.plan;
  }
  if (planInFlight.has(cacheKey)) {
    console.log(`[interview/plan] Reusing in-flight plan promise for ${payload.jobTitle}`);
    return planInFlight.get(cacheKey)!;
  }

  const execPromise = (async () => {
    const t0 = Date.now();
    const geminiKeys = getGeminiApiKeys();
    const openAiKey = process.env["OPENAI_API_KEY"]?.trim();

    const companyName =
      payload.company ||
      (payload.jobPosting["company"] as string) ||
      (payload.jobPosting["company_name"] as string) ||
      "Company";
    const level = detectLevel((payload.jobPosting["experience"] as string) || "", payload.jobTitle);

    const systemPrompt = `You are Bable, HireSense's lead AI technical interviewer.
Generate exactly 5 role-specific, spoken-length interview questions for the position of "${payload.jobTitle}" at "${companyName}".
Role seniority level detected: ${level.toUpperCase()}.

State machine slot allocation:
1. q1_intro (phase: intro, phaseLabel: "Candidate Introduction & Role Interest"): Warm opening, state candidate role and company, ask for intro and motivation.
2. q2_technical (phase: technical, phaseLabel: "Core Domain & Technical Depth"): Test the primary mandatory skill. ${
      level === "entry"
        ? "Ask core concept fundamentals and a common pitfall."
        : "Ask applied engineering trade-offs and architectural decisions."
    }
3. q3_architecture (phase: architecture, phaseLabel: "Project & Design Depth"): ${
      payload.analysis?.strengths?.[0]?.evidence_quote
        ? `Grounded in resume evidence quote: "${payload.analysis.strengths[0].evidence_quote}". Ask for specific individual contribution and retrospective improvements.`
        : "Probe a secondary mandatory or architectural skill in a real production system context."
    }
4. q4_scenario (phase: scenario, phaseLabel: "Situational Judgment & Problem Solving"): A real-world failure triage scenario derived from job responsibilities.
5. q5_closing (phase: closing, phaseLabel: "Engineering Growth & Wrap-up"): ${
      payload.analysis?.gaps?.[0]?.requirement
        ? `Grounded in candidate gap "${payload.analysis.gaps[0].requirement}". Probe how they would rapidly become productive with it.`
        : "Continuous engineering learning, evaluating new tools, and long-term maintainability."
    }

STRICT LANGUAGE RULES:
- Language: Output in ${
      payload.language === "hi"
        ? "Hindi (Devanagari script with English technical terms in Latin script like 'React', 'PostgreSQL', 'latency')"
        : payload.language === "hinglish"
          ? "Hinglish (conversational code-mixed Indian English and Roman Hindi, e.g., 'Aapne React ko use karte waqt...')"
          : "English"
    }.
- Spoken-length: Under 35 words per question. Conversational, natural, and clear.
- No write-code-on-screen requests. Must be answerable verbally in under 2 minutes.
- Prohibited topics: Never ask about age, religion, family, caste, nationality, gender, or health.
- NEVER mention any other company name (such as Square, Mastercard, PayPal, Amazon, Google, etc.). Only mention "${companyName}".
- Every question must return "groundedIn", "contextHint", "expectedKeywords", and "idealAnswerOutline" (concrete points).

Return JSON strictly matching schema:
{
  "questions": [
    {
      "id": "q1_intro" | "q2_technical" | "q3_architecture" | "q4_scenario" | "q5_closing",
      "phase": "intro" | "technical" | "architecture" | "scenario" | "closing",
      "phaseLabel": string,
      "question": string (<= 35 spoken words),
      "contextHint": string,
      "expectedKeywords": string[],
      "idealAnswerOutline": string (3-4 bullet points),
      "groundedIn": string
    }
  ]
}`;

    const userPromptContent = `Job Title: ${payload.jobTitle}
Company: ${companyName}
Level: ${level}
Job Requirements: ${JSON.stringify(payload.jobPosting)}
Candidate Resume Summary: ${payload.resumeSummary || "Standard candidate profile"}
Candidate Resume Analysis: ${JSON.stringify(payload.analysis || {})}`;

    // Helper to validate and verify
    const tryValidate = (parsedJson: unknown) => {
      const parsed = LlmPlanSchema.safeParse(parsedJson);
      if (!parsed.success) {
        return {
          valid: false,
          errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        };
      }
      return validatePlan(
        parsed.data.questions as InterviewQuestion[],
        payload.jobTitle,
        payload.jobPosting,
        {
          language: payload.language,
          company: companyName,
          analysis: payload.analysis,
        },
      );
    };

    // 1. Try Gemini primary (with multi-key rotation and model fallback)
    if (geminiKeys.length > 0) {
      for (let kIdx = 0; kIdx < geminiKeys.length; kIdx++) {
        const currentGeminiKey = geminiKeys[kIdx];
        let keyExhausted = false;

        for (const candidateModel of CANDIDATE_GEMINI_MODELS) {
          try {
            let attemptPrompt = userPromptContent;
            for (let attempt = 0; attempt < 2; attempt++) {
              const resp = await fetchWithRetry(
                `interview/plan.gemini[key#${kIdx + 1}]`,
                `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${currentGeminiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [{ text: systemPrompt }, { text: attemptPrompt }],
                      },
                    ],
                    generationConfig: {
                      responseMimeType: "application/json",
                      temperature: attempt === 0 ? 0.2 : 0.0,
                    },
                  }),
                },
                TIMEOUT_LLM,
              );

              if (resp.ok) {
                const data = await resp.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawText) {
                  try {
                    const parsed = JSON.parse(rawText);
                    const valResult = tryValidate(parsed);
                    if (valResult.valid) {
                      console.log(`[interview/plan] Generated via Gemini (${candidateModel}) with key #${kIdx + 1} in ${Date.now() - t0}ms`);
                      const plan = {
                        questions: (parsed.questions as InterviewQuestion[]).slice(0, 5),
                        modelUsed: candidateModel,
                        source: "llm" as const,
                      };
                      planCache.set(cacheKey, { timestamp: Date.now(), plan });
                      return plan;
                    } else if (attempt === 0) {
                      attemptPrompt += `\n\nPREVIOUS ATTEMPT ERRORS (FIX THEM STRICTLY):\n${valResult.errors.join("\n")}`;
                    }
                  } catch (parseErr) {
                    console.warn("[interview/plan] JSON parse error from Gemini:", parseErr);
                  }
                }
              } else {
                const status = resp.status;
                const errSnippet = await resp.clone().text().catch(() => "");
                if (
                  status === 429 ||
                  status === 403 ||
                  errSnippet.includes("RESOURCE_EXHAUSTED") ||
                  errSnippet.includes("quota")
                ) {
                  console.warn(`[interview/plan] Gemini key #${kIdx + 1} quota/billing exhausted (${status}). Rotating to next key...`);
                  keyExhausted = true;
                  break;
                }
              }
            }
          } catch (geminiErr) {
            console.warn(`[interview/plan] Gemini error with ${candidateModel} on key #${kIdx + 1}:`, geminiErr);
          }
          if (keyExhausted) break;
        }

        if (keyExhausted) continue;
      }
    }

    // 2. Try OpenAI fallback
    if (openAiKey) {
      try {
        let attemptPrompt = userPromptContent;
        for (let attempt = 0; attempt < 2; attempt++) {
          const resp = await fetchWithRetry(
            "interview/plan.openai",
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAiKey}`,
              },
              body: JSON.stringify({
                model: LLM_MODEL_FALLBACK,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: attemptPrompt },
                ],
                response_format: { type: "json_object" },
                temperature: attempt === 0 ? 0.2 : 0.0,
              }),
            },
            TIMEOUT_LLM,
          );

          if (resp.ok) {
            const data = await resp.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              try {
                const parsed = JSON.parse(content);
                const valResult = tryValidate(parsed);
                if (valResult.valid) {
                  console.log(`[interview/plan] Generated via OpenAI in ${Date.now() - t0}ms`);
                  const plan = {
                    questions: (parsed.questions as InterviewQuestion[]).slice(0, 5),
                    modelUsed: LLM_MODEL_FALLBACK,
                    source: "llm" as const,
                  };
                  planCache.set(cacheKey, { timestamp: Date.now(), plan });
                  return plan;
                } else if (attempt === 0) {
                  attemptPrompt += `\n\nPREVIOUS ATTEMPT ERRORS (FIX THEM STRICTLY):\n${valResult.errors.join("\n")}`;
                }
              } catch (parseErr) {
                console.warn("[interview/plan] JSON parse error from OpenAI:", parseErr);
              }
            }
          } else {
            // On non-OK HTTP status (e.g. 429 quota exhaustion), break immediately to fallback provider
            break;
          }
        }
      } catch (openAiErr) {
        console.warn("[interview/plan] OpenAI fallback:", openAiErr);
      }
    }

    // 3. Fallback to deterministic plan
    console.log(`[interview/plan] Using deterministic planner in ${Date.now() - t0}ms`);
    const deterministic = generateInterviewQuestions(payload.jobTitle, payload.jobPosting, {
      language: payload.language,
      company: companyName,
      analysis: payload.analysis,
    });
    const plan = {
      questions: deterministic,
      modelUsed: "HireSense Dynamic Planner",
      source: "template" as const,
    };
    planCache.set(cacheKey, { timestamp: Date.now(), plan });
    return plan;
  })();

  planInFlight.set(cacheKey, execPromise);
  try {
    return await execPromise;
  } finally {
    planInFlight.delete(cacheKey);
  }
}

/* ========================================================================== */
/* 2. /api/interview/turn                                                     */
/* ========================================================================== */

export const TurnRequestSchema = z.object({
  questionId: z.string(),
  phase: z.string(),
  currentQuestion: z.string(),
  candidateAnswer: z.string().optional().default(""),
  hasFollowedUp: z.boolean().optional().default(false),
  language: z.enum(["en", "hi", "hinglish"]).optional().default("en"),
});

export type TurnRequest = z.infer<typeof TurnRequestSchema>;

export async function handleInterviewTurn(payload: TurnRequest) {
  const answer = payload.candidateAnswer.trim();

  if (payload.hasFollowedUp) {
    return {
      shouldFollowUp: false,
      followUpQuestion: null,
      feedback: "Answer received. Advancing to next question.",
    };
  }

  if (answer.length === 0) {
    return {
      shouldFollowUp: false,
      followUpQuestion: null,
      feedback: "Unanswered. Advancing to next question.",
    };
  }

  const wordCount = answer.split(/\s+/).length;
  const needFollowUp = wordCount < 15;
  return {
    shouldFollowUp: needFollowUp,
    followUpQuestion: needFollowUp
      ? "Could you elaborate briefly on the specific implementation steps you took?"
      : null,
    feedback: "Turn processed.",
  };
}

/* ========================================================================== */
/* 3. /api/interview/evaluate                                                 */
/* ========================================================================== */

export const EvaluateRequestSchema = z.object({
  candidateName: z.string().min(1),
  targetJobTitle: z.string().min(1),
  jobPosting: z.record(z.unknown()).optional().default({}),
  questions: z.array(
    z.object({
      id: z.string(),
      phase: z
        .enum(["intro", "technical", "architecture", "scenario", "closing"])
        .optional()
        .default("technical"),
      phaseLabel: z.string(),
      question: z.string(),
      expectedKeywords: z.array(z.string()).optional().default([]),
      idealAnswerOutline: z.string().optional().default(""),
      groundedIn: z.string().optional(),
    }),
  ),
  answers: z.record(z.string()),
  durations: z.record(z.number()),
  language: z.enum(["en", "hi", "hinglish"]).optional().default("en"),
});

export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

const RubricItemSchema = z.object({
  questionId: z.string(),
  rubric: z.object({
    technicalCorrectness: z.number().min(0).max(100).nullable(),
    problemSolving: z.number().min(0).max(100).nullable(),
    projectUnderstanding: z.number().min(0).max(100).nullable(),
    relevanceCompleteness: z.number().min(0).max(100).nullable(),
    communicationClarity: z.number().min(0).max(100).nullable(),
    behavioralEvidence: z.number().min(0).max(100).nullable(),
  }),
  evidenceQuotes: z.array(z.string()).optional().default([]),
  strengths: z.array(z.string()).optional().default([]),
  gaps: z.array(z.string()).optional().default([]),
  englishTranslation: z.string().optional(),
  confidence: z.number().min(0).max(100).nullable().optional(),
});

const LlmEvaluateResponseSchema = z.object({
  answers: z.array(RubricItemSchema),
  keyTakeaways: z.array(z.string()).optional().default([]),
  gaps: z.array(z.string()).optional().default([]),
  questionsToVerify: z.array(z.string()).optional().default([]),
});

export async function handleInterviewEvaluate(payload: EvaluateRequest) {
  const t0 = Date.now();
  const geminiKeys = getGeminiApiKeys();
  const openAiKey = process.env["OPENAI_API_KEY"]?.trim();

  // Check if all questions were unanswered
  const totalAnswers = Object.values(payload.answers).filter(
    (a) => a && a.trim().length > 0 && a !== "[Unanswered]",
  ).length;

  if (totalAnswers === 0) {
    const emptyScorecard = evaluateInterviewSession(
      payload.candidateName,
      payload.targetJobTitle,
      payload.questions as InterviewQuestion[],
      payload.answers,
      payload.durations,
      payload.language,
    );
    return emptyScorecard;
  }

  const level = detectLevel(
    (payload.jobPosting["experience"] as string) || "",
    payload.targetJobTitle,
  );

  const systemPrompt = `You are HireSense's objective interview evaluation rubric engine.
Score the candidate's actual interview transcript strictly against the 6 rubric dimensions:
1. technicalCorrectness (weight 35%)
2. problemSolving (weight 20%)
3. projectUnderstanding (weight 15%)
4. relevanceCompleteness (weight 10%)
5. communicationClarity (weight 10%)
6. behavioralEvidence (weight 10%)

CRITICAL CALIBRATION & HONESTY RULES:
- ROLE LEVEL CALIBRATION: The candidate is evaluated for a ${level.toUpperCase()} level role.
  A fully correct, well-derived answer to a ${level}-level question scores 85-95 on technical correctness, not 35!
- SPEECH-TO-TEXT TOLERANCE: Be tolerant of speech recognition artifacts, minor word repetitions, and typos.
- ACCENT & MULTILINGUAL FAIRNESS: Do NOT penalize accent, grammar, code-mixing, or non-English answers.
  "communicationClarity" measures structure, coherence, and completeness only.
- HINDI & HINGLISH ANSWERS: Score the content of Hindi and Hinglish answers directly in the language provided.
  Always return "englishTranslation" for recruiter review when the candidate answered in Hindi or Hinglish.
- TRIVIAL & EMPTY ANSWERS: Trivial input (greetings like "hello", "namaste", "idk", single characters, or empty) MUST score 0 across all dimensions (at most 15 on communicationClarity for a polite greeting).
- OBJECTIVE PROCTORING: NEVER infer personality, honesty, confidence, or psychological traits.
- EVIDENCE GROUNDING: Every "evidenceQuotes" item MUST be an exact, case-insensitive substring of the candidate's answer, each <= 25 words.

CRITICAL SCHEMA INSTRUCTION:
Do NOT output "overallScore", "categories", or "fitVerdict". Those are calculated deterministically in server code!
Return JSON strictly matching this format:
{
  "answers": [
    {
      "questionId": "MUST be one of the listed question IDs verbatim (e.g., q1_intro, q2_technical...)",
      "rubric": {
        "technicalCorrectness": integer 0-100 or null if not applicable to this question,
        "problemSolving": integer 0-100 or null,
        "projectUnderstanding": integer 0-100 or null,
        "relevanceCompleteness": integer 0-100 or null,
        "communicationClarity": integer 0-100 or null,
        "behavioralEvidence": integer 0-100 or null
      },
      "evidenceQuotes": [string],
      "strengths": [string],
      "gaps": [string],
      "englishTranslation": string,
      "confidence": integer 0-100
    }
  ],
  "keyTakeaways": [string],
  "gaps": [string],
  "questionsToVerify": [string]
}`;

  const promptContent = `Candidate Name: ${payload.candidateName}
Target Role: ${payload.targetJobTitle}
Role Seniority Level: ${level}
Session Language Mode: ${payload.language}

QUESTIONS AND CANDIDATE TRANSCRIPTS:
${payload.questions
  .map(
    (q) => `[${q.id}] (${q.phaseLabel})
Question: "${q.question}"
Candidate Answer: "${payload.answers[q.id] || "[Unanswered]"}"
Duration: ${payload.durations[q.id] || 0}s`,
  )
  .join("\n\n")}`;

  // Helper to process, validate, and compute final scorecard
  const processLlmResponse = (
    parsed: z.infer<typeof LlmEvaluateResponseSchema>,
    modelUsed: string,
  ): InterviewScorecard => {
    const rawAnswersList = parsed.answers || [];

    const processedAnswers: CandidateAnswerRecord[] = payload.questions.map((q, idx) => {
      let matched = rawAnswersList.find((a) => a.questionId === q.id);
      if (!matched && rawAnswersList.length === payload.questions.length && rawAnswersList[idx]) {
        console.warn(
          `[interview/evaluate] questionId "${q.id}" not matched; falling back to array index ${idx}`,
        );
        matched = rawAnswersList[idx];
      }

      const rawAnswer = (payload.answers[q.id] || "").trim();
      const isUnanswered = !rawAnswer || rawAnswer === "[Unanswered]";
      const isTrivial =
        rawAnswer.length < 3 || /^(hello|hi|hey|s|asdf|wfdf|pass|idk|namaste)$/i.test(rawAnswer);

      if (!matched) {
        // Fall back to deterministic single-answer score for this missing question
        const fallbackSingle = evaluateInterviewSession(
          payload.candidateName,
          payload.targetJobTitle,
          [q as InterviewQuestion],
          { [q.id]: rawAnswer },
          { [q.id]: payload.durations[q.id] || 0 },
          payload.language,
        ).answers[0];

        return (
          fallbackSingle || {
            questionId: q.id,
            question: q.question,
            phaseLabel: q.phaseLabel,
            transcribedAnswer: rawAnswer || "[Unanswered / Skipped]",
            durationSeconds: payload.durations[q.id] || 0,
            rubric: {
              technicalCorrectness: 0,
              problemSolving: 0,
              projectUnderstanding: 0,
              relevanceCompleteness: 0,
              communicationClarity: 0,
              behavioralEvidence: 0,
            },
            compositeScore: 0,
            evidenceQuotes: [],
            confidence: null,
            answerLanguage: payload.language,
            metrics: { technicalScore: 0, clarityScore: 0, relevanceScore: 0 },
            strengths: ["No answer recorded."],
            improvements: ["Provide substantive technical detail."],
            modelAnswer: q.idealAnswerOutline || "",
          }
        );
      }

      let rubric: RubricScores;
      if (isUnanswered || isTrivial) {
        rubric = {
          technicalCorrectness: 0,
          problemSolving: 0,
          projectUnderstanding: 0,
          relevanceCompleteness: 0,
          communicationClarity: isTrivial ? 15 : 0,
          behavioralEvidence: 0,
        };
      } else {
        rubric = {
          technicalCorrectness: matched.rubric.technicalCorrectness,
          problemSolving: matched.rubric.problemSolving,
          projectUnderstanding: matched.rubric.projectUnderstanding,
          relevanceCompleteness: matched.rubric.relevanceCompleteness,
          communicationClarity: matched.rubric.communicationClarity,
          behavioralEvidence: matched.rubric.behavioralEvidence,
        };
      }

      const compositeScore = computeComposite(rubric);

      // Verify evidence quotes are verbatim case-insensitive substrings of the actual answer
      const survivingQuotes: string[] = [];
      const lowerAnswer = rawAnswer.toLowerCase();
      for (const quote of matched.evidenceQuotes || []) {
        if (quote && quote.trim().length > 3 && lowerAnswer.includes(quote.trim().toLowerCase())) {
          survivingQuotes.push(quote.trim());
        }
      }

      let answerConfidence = matched.confidence ?? 85;
      if (compositeScore > 0 && survivingQuotes.length === 0 && !isTrivial) {
        answerConfidence = Math.min(answerConfidence, 40);
      }

      return {
        questionId: q.id,
        question: q.question,
        phaseLabel: q.phaseLabel,
        transcribedAnswer: rawAnswer || "[Unanswered / Skipped]",
        durationSeconds: payload.durations[q.id] || 0,
        rubric,
        compositeScore,
        evidenceQuotes: survivingQuotes,
        confidence: isUnanswered ? null : answerConfidence,
        englishTranslation: matched.englishTranslation || undefined,
        answerLanguage: payload.language,
        metrics: {
          technicalScore: rubric.technicalCorrectness ?? 0,
          clarityScore: rubric.communicationClarity ?? 0,
          relevanceScore: rubric.relevanceCompleteness ?? 0,
        },
        strengths: isTrivial
          ? ["Polite engagement or greeting captured."]
          : matched.strengths.length > 0
            ? matched.strengths
            : ["Engagement with question prompt recorded."],
        improvements: isTrivial
          ? [
              "Response was non-substantive. Provide concrete technical architecture and trade-off details.",
            ]
          : matched.gaps.length > 0
            ? matched.gaps
            : ["Elaborate on production failure modes and trade-offs."],
        modelAnswer: q.idealAnswerOutline || "",
      };
    });

    const { overallScore, categories, fitVerdict } = aggregateScorecard(processedAnswers);

    const totalDuration = Object.values(payload.durations).reduce((a, b) => a + b, 0);
    const mins = Math.floor(totalDuration / 60);
    const secs = totalDuration % 60;

    return {
      candidateName: payload.candidateName,
      targetJobTitle: payload.targetJobTitle,
      overallScore,
      fitVerdict,
      completedAt: new Date().toISOString(),
      durationFormatted: `${mins > 0 ? `${mins}m ` : ""}${secs}s`,
      evaluationSource: "llm",
      modelUsed,
      lowConfidence: false,
      language: payload.language,
      categories,
      answers: processedAnswers,
      keyTakeaways:
        parsed.keyTakeaways.length > 0
          ? parsed.keyTakeaways
          : ["Comprehensive interview completed."],
      gaps:
        parsed.gaps.length > 0
          ? parsed.gaps
          : ["Verify deeper edge-case handling in live technical round."],
      recruiterVerificationNotes:
        parsed.questionsToVerify.length > 0
          ? parsed.questionsToVerify
          : ["Conduct live code walkthrough on core system boundaries."],
    };
  };

  // 1. Try Gemini Primary (with multi-key rotation and model fallback)
  if (geminiKeys.length > 0) {
    for (let kIdx = 0; kIdx < geminiKeys.length; kIdx++) {
      const currentGeminiKey = geminiKeys[kIdx];
      let keyExhausted = false;

      for (const candidateModel of CANDIDATE_GEMINI_MODELS) {
        try {
          let promptToUse = promptContent;
          for (let attempt = 0; attempt < 2; attempt++) {
            const resp = await fetchWithRetry(
              `interview/evaluate.gemini[key#${kIdx + 1}]`,
              `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${currentGeminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [{ text: systemPrompt }, { text: promptToUse }],
                    },
                  ],
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: attempt === 0 ? 0.1 : 0.0,
                  },
                }),
              },
              TIMEOUT_LLM,
            );

            if (resp.ok) {
              const data = await resp.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                try {
                  const rawJson = JSON.parse(text);
                  const validated = LlmEvaluateResponseSchema.safeParse(rawJson);
                  if (validated.success) {
                    console.log(`[interview/evaluate] Evaluated via Gemini (${candidateModel}) with key #${kIdx + 1} in ${Date.now() - t0}ms`);
                    return processLlmResponse(validated.data, candidateModel);
                  } else if (attempt === 0) {
                    promptToUse += `\n\nSCHEMA VALIDATION ERRORS FROM PREVIOUS ATTEMPT (FIX STRICTLY):\n${validated.error.issues.map((i) => i.message).join("\n")}`;
                  }
                } catch (parseErr) {
                  console.warn("[interview/evaluate] Gemini JSON parse error:", parseErr);
                }
              }
            } else {
              const status = resp.status;
              const errSnippet = await resp.clone().text().catch(() => "");
              if (
                status === 429 ||
                status === 403 ||
                errSnippet.includes("RESOURCE_EXHAUSTED") ||
                errSnippet.includes("quota")
              ) {
                console.warn(`[interview/evaluate] Gemini key #${kIdx + 1} quota/billing exhausted (${status}). Rotating to next key...`);
                keyExhausted = true;
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`[interview/evaluate] Gemini error with ${candidateModel} on key #${kIdx + 1}:`, e);
        }
        if (keyExhausted) break;
      }

      if (keyExhausted) continue;
    }
  }

  // 2. Try OpenAI Fallback
  if (openAiKey) {
    try {
      let promptToUse = promptContent;
      for (let attempt = 0; attempt < 2; attempt++) {
        const resp = await fetchWithRetry(
          "interview/evaluate.openai",
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: LLM_MODEL_FALLBACK,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: promptToUse },
              ],
              response_format: { type: "json_object" },
              temperature: attempt === 0 ? 0.1 : 0.0,
            }),
          },
          TIMEOUT_LLM,
        );

        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            try {
              const rawJson = JSON.parse(content);
              const validated = LlmEvaluateResponseSchema.safeParse(rawJson);
              if (validated.success) {
                console.log(`[interview/evaluate] Evaluated via OpenAI in ${Date.now() - t0}ms`);
                return processLlmResponse(validated.data, LLM_MODEL_FALLBACK);
              } else if (attempt === 0) {
                promptToUse += `\n\nSCHEMA VALIDATION ERRORS FROM PREVIOUS ATTEMPT (FIX STRICTLY):\n${validated.error.issues.map((i) => i.message).join("\n")}`;
              }
            } catch (parseErr) {
              console.warn("[interview/evaluate] OpenAI JSON parse error:", parseErr);
            }
          }
        } else {
          // On non-OK HTTP status (e.g. 429 quota exhaustion), break immediately to fallback provider
          break;
        }
      }
    } catch (e) {
      console.warn("[interview/evaluate] OpenAI fallback:", e);
    }
  }

  // 3. Fallback to deterministic evaluation
  console.log(`[interview/evaluate] Using deterministic scorecard in ${Date.now() - t0}ms`);
  return evaluateInterviewSession(
    payload.candidateName,
    payload.targetJobTitle,
    payload.questions as InterviewQuestion[],
    payload.answers,
    payload.durations,
    payload.language,
  );
}

/* ========================================================================== */
/* 4. /api/speech/transcribe                                                  */
/* ========================================================================== */

export const TranscribeRequestSchema = z.object({
  audioBase64: z.string(),
  mimeType: z.string().optional().default("audio/wav"),
  language: z.enum(["en", "hi", "hinglish"]).optional().default("en"),
  fallbackText: z.string().optional().default(""),
});

export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;

export async function handleSpeechTranscribe(payload: TranscribeRequest) {
  const t0 = Date.now();
  const geminiKeys = getGeminiApiKeys();
  const openAiKey = process.env["OPENAI_API_KEY"]?.trim();

  // Language-specific transcription prompts
  let languageInstruction = "Transcribe English speech verbatim.";
  if (payload.language === "hi") {
    languageInstruction =
      "Transcribe Hindi speech verbatim in Devanagari script. Keep English technical terms in Latin script (e.g., 'React', 'PostgreSQL', 'database').";
  } else if (payload.language === "hinglish") {
    languageInstruction =
      "Transcribe Hinglish (code-mixed Hindi and English) verbatim in Roman script. Keep technical terms in standard English.";
  }

  const prompt = `Listen to the audio recording carefully and transcribe it strictly and verbatim.
${languageInstruction}
Rules:
- Output ONLY the transcription text. No preface, no explanations, no summaries.
- Mark inaudible, cut-off, or unintelligible speech as [inaudible].`;

  // 1. Try Gemini Audio Transcription (with multi-key rotation and model fallback)
  if (geminiKeys.length > 0 && payload.audioBase64.length > 50) {
    const candidateSttModels = [
      STT_MODEL,
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3.5-transcribe",
      "gemini-flash-latest",
    ];

    for (let kIdx = 0; kIdx < geminiKeys.length; kIdx++) {
      const currentGeminiKey = geminiKeys[kIdx];
      let keyExhausted = false;

      for (const candidateModel of candidateSttModels) {
        try {
          const resp = await fetchWithRetry(
            `speech/transcribe.gemini[key#${kIdx + 1}]`,
            `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${currentGeminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType: (payload.mimeType || "audio/webm").split(";")[0],
                          data: payload.audioBase64,
                        },
                      },
                    ],
                  },
                ],
              }),
            },
            TIMEOUT_STT,
          );

          if (resp.ok) {
            const data = await resp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text && text.length > 0) {
              console.log(`[speech/transcribe] Gemini (${candidateModel}) transcribed with key #${kIdx + 1} in ${Date.now() - t0}ms`);
              return {
                transcript: text,
                provider: "gemini",
                confidence: null,
              };
            }
          } else {
            const status = resp.status;
            const errSnippet = await resp.clone().text().catch(() => "");
            if (
              status === 429 ||
              status === 403 ||
              errSnippet.includes("RESOURCE_EXHAUSTED") ||
              errSnippet.includes("quota")
            ) {
              console.warn(`[speech/transcribe] Gemini key #${kIdx + 1} quota/billing exhausted (${status}). Rotating to next key...`);
              keyExhausted = true;
              break;
            }
          }
        } catch (e) {
          console.warn(`[speech/transcribe] Gemini error with ${candidateModel} on key #${kIdx + 1}:`, e);
        }
        if (keyExhausted) break;
      }

      if (keyExhausted) continue;
    }
  }

  // 2. Try OpenAI Whisper if key present
  if (openAiKey && payload.audioBase64.length > 50) {
    try {
      const buffer = Buffer.from(payload.audioBase64, "base64");
      const mime = (payload.mimeType || "audio/webm").split(";")[0] || "audio/webm";
      const ext = mime.includes("wav")
        ? "wav"
        : mime.includes("mp4")
          ? "mp4"
          : mime.includes("mpeg")
            ? "mp3"
            : "webm";
      const blob = new Blob([buffer], { type: mime });
      const formData = new FormData();
      formData.append("file", blob, `audio.${ext}`);
      formData.append("model", "whisper-1");

      if (payload.language === "en") {
        formData.append("language", "en");
      } else if (payload.language === "hi") {
        formData.append("language", "hi");
      } else if (payload.language === "hinglish") {
        formData.append("prompt", "Hinglish: Hindi and English mixed; technical terms in English.");
      }

      const resp = await fetchWithRetry(
        "speech/transcribe.whisper",
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${openAiKey}` },
          body: formData,
        },
        TIMEOUT_STT,
      );

      if (resp.ok) {
        const data = await resp.json();
        if (data.text) {
          console.log(`[speech/transcribe] OpenAI Whisper transcribed in ${Date.now() - t0}ms`);
          return {
            transcript: data.text.trim(),
            provider: "openai",
            confidence: null,
          };
        }
      }
    } catch (e) {
      console.warn("[speech/transcribe] OpenAI Whisper fallback:", e);
    }
  }

  // 3. Fallback to client-side Web Speech interim caption text
  console.log(`[speech/transcribe] Falling back to client caption text in ${Date.now() - t0}ms`);
  return {
    transcript: payload.fallbackText || "",
    provider: "client_fallback",
    confidence: null,
  };
}

/* ========================================================================== */
/* 5. /api/speech/synthesize                                                  */
/* ========================================================================== */

export const SynthesizeRequestSchema = z.object({
  text: z.string().min(1),
  language: z.enum(["en", "hi", "hinglish"]).optional().default("en"),
  voice: z.string().optional(),
});

export type SynthesizeRequest = z.infer<typeof SynthesizeRequestSchema>;

export async function handleSpeechSynthesize(payload: SynthesizeRequest) {
  const openAiKey = process.env["OPENAI_API_KEY"]?.trim();

  // If OpenAI key is available, call OpenAI TTS
  if (openAiKey) {
    try {
      const chosenVoice = resolveOpenAiVoice(payload.voice);

      const resp = await fetchWithRetry(
        "speech/synthesize.openai",
        "https://api.openai.com/v1/audio/speech",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: TTS_MODEL && TTS_MODEL.startsWith("tts-") ? TTS_MODEL : "tts-1",
            input: payload.text,
            voice: chosenVoice,
            response_format: "mp3",
          }),
        },
        TIMEOUT_TTS,
      );

      if (resp.ok) {
        const arrayBuffer = await resp.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return {
          audioBase64: base64,
          mimeType: "audio/mpeg",
          useBrowserFallback: false,
        };
      }
    } catch (e) {
      console.warn("[speech/synthesize] OpenAI TTS fallback:", e);
    }
  }

  // Clean fallback: tell client to use Web Speech speechSynthesis
  return {
    audioBase64: null,
    mimeType: null,
    useBrowserFallback: true,
  };
}
