// HireSense AI Interview Evaluation Engine
// Generates role-grounded questions and computes structured scorecards.

import {
  generateInterviewQuestions as plannerGenerateQuestions,
  type PlanContext,
} from "@/lib/interview-planner";
import {
  computeComposite,
  aggregateScorecard,
  type RubricScores,
  type FitVerdict,
} from "@/lib/scoring";

export interface InterviewQuestion {
  id: string;
  phase: "intro" | "technical" | "architecture" | "scenario" | "closing";
  phaseLabel: string;
  question: string;
  contextHint: string;
  expectedKeywords: string[];
  idealAnswerOutline: string;
  groundedIn?: string;
}

export interface CandidateAnswerRecord {
  questionId: string;
  question: string;
  phaseLabel: string;
  transcribedAnswer: string;
  durationSeconds: number;
  rubric: RubricScores;
  compositeScore: number;
  evidenceQuotes: string[];
  confidence: number | null;
  englishTranslation?: string | undefined;
  answerLanguage: "en" | "hi" | "hinglish";
  metrics: {
    technicalScore: number;
    clarityScore: number;
    relevanceScore: number;
  };
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

export interface InterviewScorecard {
  candidateName: string;
  targetJobTitle: string;
  overallScore: number; // 0-100, computed in code from mean of compositeScores
  fitVerdict: FitVerdict;
  completedAt: string;
  durationFormatted: string;
  evaluationSource: "llm" | "deterministic";
  modelUsed: string;
  lowConfidence: boolean;
  language: "en" | "hi" | "hinglish";
  categories: {
    technicalAccuracy: number;
    communicationClarity: number;
    problemSolving: number;
    practicalEvidence: number;
  };
  answers: CandidateAnswerRecord[];
  keyTakeaways: string[];
  gaps: string[];
  recruiterVerificationNotes: string[];
}

/**
 * Dynamically builds a 5-question interview plan grounded in the job and candidate background.
 */
export function generateInterviewQuestions(
  targetJobTitle: string,
  jobPosting: Record<string, unknown> = {},
  ctx: PlanContext = {},
): InterviewQuestion[] {
  return plannerGenerateQuestions(targetJobTitle, jobPosting, ctx);
}

/**
 * Evaluates whether an answer is pure noise, a trivial greeting, or non-technical filler.
 */
function isTrivialOrGreeting(text: string): { isTrivial: boolean; isGreetingOnly: boolean } {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed || trimmed === "[unanswered]" || trimmed === "none" || trimmed === "n/a") {
    return { isTrivial: true, isGreetingOnly: false };
  }

  // Greetings list
  const greetings = new Set([
    "hello",
    "hi",
    "hey",
    "hi there",
    "hello there",
    "good morning",
    "good afternoon",
    "good evening",
    "greetings",
    "hey bable",
    "hello bable",
    "namaste bable",
    "hey mira",
    "hello mira",
    "namaste",
    "namaste mira",
  ]);
  if (greetings.has(trimmed)) {
    return { isTrivial: true, isGreetingOnly: true };
  }

  // Non-answers and single characters
  const nonAnswers = new Set([
    "yes",
    "no",
    "ok",
    "okay",
    "sure",
    "fine",
    "test",
    "testing",
    "idk",
    "i dont know",
    "i don't know",
    "pass",
    "skip",
    "nothing",
    "bye",
    "thanks",
    "thank you",
  ]);
  if (nonAnswers.has(trimmed)) {
    return { isTrivial: true, isGreetingOnly: false };
  }

  // Single characters or repeating gibberish (e.g., "s", "aaaa", "wfdf")
  if (trimmed.length <= 2) {
    return { isTrivial: true, isGreetingOnly: false };
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1 && /^(.)\1+$/.test(trimmed)) {
    return { isTrivial: true, isGreetingOnly: false };
  }

  return { isTrivial: false, isGreetingOnly: false };
}

/**
 * Detects answer language roughly based on script character distribution.
 */
function detectAnswerLanguage(text: string): "en" | "hi" | "hinglish" {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  const total = devanagariCount + latinCount;
  if (total === 0) return "en";
  if (devanagariCount / total > 0.4) return "hi";
  if (
    /\b(aap|kya|kaise|mein|hai|hain|ko|ke|ki|aur|karna|hoga|karein|apna|apne|bhi|se|hum)\b/i.test(
      text,
    )
  ) {
    return "hinglish";
  }
  return "en";
}

/**
 * Deterministic fallback evaluation path.
 * Computes rubric dimensions via transparent heuristic proxies, then aggregates
 * strictly via computeComposite and aggregateScorecard.
 */
export function evaluateInterviewSession(
  candidateName: string,
  targetJobTitle: string,
  questions: InterviewQuestion[],
  answers: Record<string, string>,
  durations: Record<string, number>,
  language: "en" | "hi" | "hinglish" = "en",
): InterviewScorecard {
  let substantiveAnswersCount = 0;

  const totalDurationSeconds = Object.values(durations).reduce((acc, d) => acc + d, 0);
  const minutes = Math.floor(totalDurationSeconds / 60);
  const seconds = totalDurationSeconds % 60;
  const durationFormatted = `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;

  const processedAnswers: CandidateAnswerRecord[] = questions.map((q) => {
    const rawAnswer = (answers[q.id] || "").trim();
    const duration = durations[q.id] || 30;
    const lower = rawAnswer.toLowerCase();
    const words = rawAnswer.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const ansLang = detectAnswerLanguage(rawAnswer);

    // Check trivial or greeting
    const { isTrivial, isGreetingOnly } = isTrivialOrGreeting(rawAnswer);

    // Keyword overlap (combines expected keywords and question prompt context)
    const allTokens = [
      ...q.expectedKeywords.flatMap((k) => k.toLowerCase().split(/\s+/)),
      ...q.question.toLowerCase().split(/\s+/),
    ].filter(
      (t) => t.length > 2 && !/^(the|and|for|with|that|this|you|your|what|how|about|when)$/.test(t),
    );
    const matchedTokens = allTokens.filter((token) => lower.includes(token));
    const uniqueMatched = Array.from(new Set(matchedTokens));
    const matchedCount = uniqueMatched.length;
    const tokenRatio =
      allTokens.length > 0
        ? Math.min(1, matchedCount / Math.max(2, Math.min(5, allTokens.length * 0.2)))
        : 0;

    const matchedNames = uniqueMatched;

    let technicalCorrectness: number = 0;
    let relevanceCompleteness: number = 0;
    let communicationClarity: number = 0;
    const strengths: string[] = [];
    const improvements: string[] = [];
    const evidenceQuotes: string[] = [];

    if (wordCount === 0 || rawAnswer === "[Unanswered]") {
      // Unanswered question gets all six dimensions set to 0 (not null)
      technicalCorrectness = 0;
      relevanceCompleteness = 0;
      communicationClarity = 0;
      strengths.push("No answer recorded for this question.");
      improvements.push(
        "No response was captured. Ensure your microphone is active or type your answer before submitting.",
      );
    } else if (isTrivial) {
      if (isGreetingOnly) {
        technicalCorrectness = 0;
        relevanceCompleteness = 0;
        communicationClarity = 15;
        strengths.push("Polite conversational opening.");
        improvements.push(
          "Answer was only a greeting without technical depth or role experience. Directly address the question prompt with concrete examples.",
        );
      } else {
        technicalCorrectness = 0;
        relevanceCompleteness = 0;
        communicationClarity = 0;
        strengths.push("No substantive technical content provided.");
        improvements.push(
          "Non-responsive or non-technical input captured. Provide a detailed technical explanation addressing the question requirements.",
        );
      }
    } else if (wordCount < 7 && matchedCount === 0) {
      technicalCorrectness = 5;
      relevanceCompleteness = 10;
      communicationClarity = 25;
      strengths.push("Brief verbal engagement with topic.");
      improvements.push(
        "Response was too brief and omitted core technical terminology. Expand on system mechanisms and implementation.",
      );
      substantiveAnswersCount++;
    } else {
      // Check for Devanagari answers
      const isDevanagari = ansLang === "hi";

      if (isDevanagari) {
        // Keyword overlap is unreliable for Hindi/Devanagari transcripts; score conservatively based on length & structure
        technicalCorrectness = wordCount >= 35 ? 75 : wordCount >= 20 ? 65 : 45;
        communicationClarity = wordCount >= 20 ? 75 : 55;
        relevanceCompleteness = wordCount >= 25 ? 70 : 50;
        strengths.push("Articulated practical experience in Hindi with clear verbal flow.");
        improvements.push(
          "Elaborate on specific architectural constraints and implementation metrics.",
        );
        substantiveAnswersCount++;
      } else {
        const substanceBonus =
          wordCount >= 28 ? 25 : wordCount >= 18 ? 20 : wordCount >= 10 ? 12 : 0;
        const matchBonus =
          matchedCount >= 3 ? 34 : matchedCount >= 2 ? 28 : matchedCount >= 1 ? 18 : 0;
        const keywordScore = Math.round(tokenRatio * 32);

        technicalCorrectness = Math.min(
          96,
          Math.max(25, 25 + keywordScore + matchBonus + substanceBonus),
        );
        communicationClarity = Math.min(
          96,
          Math.max(
            45,
            55 + (wordCount >= 20 ? 25 : wordCount >= 14 ? 18 : 6) + (matchedCount > 0 ? 12 : 0),
          ),
        );
        relevanceCompleteness = Math.min(
          95,
          Math.max(
            30,
            30 + Math.round(tokenRatio * 30) + matchBonus + (substanceBonus > 0 ? 10 : 0),
          ),
        );

        if (matchedCount >= 2) {
          strengths.push(
            "Articulated practical experience with context and domain terminology.",
            `Directly addressed target concepts: ${matchedNames.slice(0, 3).join(", ")}.`,
          );
        } else if (matchedCount === 1) {
          strengths.push(`Referenced core domain concept: ${matchedNames[0]}.`);
        } else {
          strengths.push("Articulated general contextual background.");
        }

        if (wordCount < 18) {
          improvements.push(
            "Response was concise; expand on specific architectural trade-offs and personal ownership.",
          );
        }
        if (wordCount < 30) {
          improvements.push(
            "Could provide concrete production metrics or measurable outcomes from past experience.",
          );
        } else {
          improvements.push(
            "Consider citing specific automated testing patterns, failure modes, or rollback runbooks.",
          );
        }
        substantiveAnswersCount++;
      }

      // Extract a plausible verbatim snippet as evidence quote (up to 20 words)
      if (rawAnswer.length > 20) {
        const snippet = rawAnswer.split(/[.?!]/)[0] || rawAnswer;
        const quoteWords = snippet.trim().split(/\s+/).slice(0, 18).join(" ");
        if (quoteWords.length > 10) {
          evidenceQuotes.push(quoteWords);
        }
      }
    }

    // Proxy mapping documented in code:
    // problemSolving and projectUnderstanding derived from mean of technical and relevance.
    // behavioralEvidence derived from mean of clarity and relevance.
    const isZero =
      technicalCorrectness === 0 && relevanceCompleteness === 0 && communicationClarity === 0;
    const problemSolving = isZero
      ? 0
      : Math.round((technicalCorrectness + relevanceCompleteness) / 2);
    const projectUnderstanding = isZero
      ? 0
      : Math.round((technicalCorrectness + relevanceCompleteness) / 2);
    const behavioralEvidence = isZero
      ? 0
      : Math.round((communicationClarity + relevanceCompleteness) / 2);

    const rubric: RubricScores = {
      technicalCorrectness,
      problemSolving,
      projectUnderstanding,
      relevanceCompleteness,
      communicationClarity,
      behavioralEvidence,
    };

    const compositeScore = computeComposite(rubric);

    return {
      questionId: q.id,
      question: q.question,
      phaseLabel: q.phaseLabel,
      transcribedAnswer: rawAnswer || "No verbal or typed answer captured during session.",
      durationSeconds: duration,
      rubric,
      compositeScore,
      evidenceQuotes,
      confidence: isZero ? null : 70,
      answerLanguage: ansLang,
      metrics: {
        technicalScore: technicalCorrectness,
        clarityScore: communicationClarity,
        relevanceScore: relevanceCompleteness,
      },
      strengths:
        strengths.length > 0 ? strengths : ["Demonstrated engagement with the question topic."],
      improvements:
        improvements.length > 0
          ? improvements
          : ["Provide deeper comparison of alternative architectural approaches."],
      modelAnswer: q.idealAnswerOutline,
    };
  });

  const { overallScore, categories, fitVerdict } = aggregateScorecard(processedAnswers);

  // Takeaways & verification notes grounded in score
  let keyTakeaways: string[];
  let gaps: string[];
  let recruiterVerificationNotes: string[];

  if (overallScore < 35 || substantiveAnswersCount === 0) {
    keyTakeaways = [
      `${candidateName} provided minimal or non-substantive responses across the majority of interview phases.`,
      `Critical gap: Insufficient technical evidence captured to verify competencies required for the ${targetJobTitle} position.`,
      `Candidate did not demonstrate practical architecture trade-offs, system mechanisms, or hands-on problem solving.`,
    ];
    gaps = [
      "Multiple interview phases were skipped, unanswered, or answered with non-technical single-word responses.",
      `Core ${targetJobTitle} technical principles were not articulated during the session.`,
      "Spoken communication was insufficient to evaluate clarity, technical vocabulary, or reasoning structure.",
    ];
    recruiterVerificationNotes = [
      `Conduct a preliminary recruiter phone screen to assess basic communication and interest in the ${targetJobTitle} role.`,
      "Verify whether brevity was due to hardware/microphone configuration or candidate unfamiliarity with the stack.",
      "Require a verified portfolio, GitHub repository, or take-home assessment before allocating engineering interview resources.",
    ];
  } else if (overallScore < 65) {
    keyTakeaways = [
      `${candidateName} demonstrated foundational familiarity with core tools, but responses remained predominantly high-level.`,
      `Strongest alignment identified in ${categories.communicationClarity >= categories.technicalAccuracy ? "communication clarity and openness" : "familiarity with target technology names"}.`,
      `Technical depth requires deeper probing: candidate named tools without fully detailing implementation constraints or trade-offs.`,
    ];
    gaps = processedAnswers
      .flatMap((a) => a.improvements)
      .filter((imp) => !imp.includes("No response was captured"))
      .slice(0, 3);
    if (gaps.length === 0) {
      gaps = [
        "Elaborate on production scalability constraints and disaster recovery patterns.",
        "Provide measurable production metrics and quantifiable impact from prior engineering projects.",
      ];
    }
    recruiterVerificationNotes = [
      "In the live technical round, focus on system design scenarios and probe past production failure modes.",
      "Ask candidate to walk through a real code sample or architecture diagram to verify hands-on execution.",
    ];
  } else {
    keyTakeaways = [
      `${candidateName} demonstrated ${fitVerdict === "Strong Fit" ? "rigorous technical depth and structured problem solving" : "competent domain knowledge"} across the interview phases.`,
      `Strongest performance identified in ${categories.technicalAccuracy >= categories.communicationClarity ? "technical architecture and domain terminology" : "articulate communication and clear reasoning"}.`,
      `Recommended next step: Proceed to live technical panel focusing on real-world system boundaries and organizational fit.`,
    ];
    gaps = processedAnswers.flatMap((a) => a.improvements).slice(0, 3);
    recruiterVerificationNotes = [
      "Validate candidate's specific ownership and code contributions on flagship projects mentioned in Question 2.",
      "Probe candidate's experience collaborating cross-functionally with product managers and stakeholders under tight deadlines.",
    ];
  }

  return {
    candidateName,
    targetJobTitle,
    overallScore,
    fitVerdict,
    completedAt: new Date().toISOString(),
    durationFormatted,
    evaluationSource: "deterministic",
    modelUsed: "HireSense Keyword Scorer",
    lowConfidence: true,
    language,
    categories,
    answers: processedAnswers,
    keyTakeaways,
    gaps,
    recruiterVerificationNotes,
  };
}
