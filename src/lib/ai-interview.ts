// HireSense AI Interview Evaluation Engine
// Generates role-grounded questions and computes structured scorecards.

export interface InterviewQuestion {
  id: string;
  phase: "intro" | "technical" | "architecture" | "scenario" | "closing";
  phaseLabel: string;
  question: string;
  contextHint: string;
  expectedKeywords: string[];
  idealAnswerOutline: string;
}

export interface CandidateAnswerRecord {
  questionId: string;
  question: string;
  phaseLabel: string;
  transcribedAnswer: string;
  durationSeconds: number;
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
  overallScore: number; // 0-100
  fitVerdict: "Strong Fit" | "Moderate Fit" | "Developing Fit";
  completedAt: string;
  durationFormatted: string;
  categories: {
    technicalAccuracy: number;
    communicationClarity: number;
    problemSolving: number;
    practicalEvidence: number;
  };
  answers: CandidateAnswerRecord[];
  keyTakeaways: string[];
  recruiterVerificationNotes: string[];
}

/**
 * Dynamically builds a 5-question interview plan grounded in the job requisition and candidate background.
 */
export function generateInterviewQuestions(
  targetJobTitle: string,
  jobPosting: Record<string, any> = {},
  verificationQuestions: string[] = []
): InterviewQuestion[] {
  const mandatoryQuals: string[] = jobPosting?.qualifications?.mandatory || [];
  const techStack: Array<{ name: string; requirement_type?: string }> = jobPosting?.tech_stack || [];
  const mandatoryTech = techStack.filter((t) => t.requirement_type === "mandatory").map((t) => t.name);

  const primaryTech = mandatoryTech[0] || "React and TypeScript";
  const secondaryTech = mandatoryTech[1] || mandatoryTech[0] || "modern component architecture";

  return [
    {
      id: "q1_intro",
      phase: "intro",
      phaseLabel: "Background & Project Verification",
      question: `Hi, I'm Mira. Welcome to your technical interview for the ${targetJobTitle} position. To start, could you introduce yourself and walk me through the most technically challenging project you have worked on recently?`,
      contextHint: "Focus on technical architecture, your individual role, tools chosen, and measurable outcomes.",
      expectedKeywords: ["project", "architecture", "built", "designed", "scale", "team", "performance"],
      idealAnswerOutline:
        "Clear 2-minute overview introducing experience, explaining problem context of a major project, technical stack decisions, personal contribution, and outcome.",
    },
    {
      id: "q2_technical",
      phase: "technical",
      phaseLabel: "Core Stack & Technical Depth",
      question:
        verificationQuestions && verificationQuestions.length > 0 && verificationQuestions[0].length > 15
          ? verificationQuestions[0]
          : `This role demands high proficiency in ${primaryTech}. Can you explain how you handle state management, asynchronous data fetching, and race conditions in production applications?`,
      contextHint: "Highlight patterns you have practically implemented, caching strategies, and edge cases.",
      expectedKeywords: [primaryTech.toLowerCase(), "state", "cache", "async", "error", "lifecycle", "optimization"],
      idealAnswerOutline:
        "Directly addresses state isolation, caching layers (e.g., React Query / TanStack), handling pending requests, cancel tokens, and error boundary integration.",
    },
    {
      id: "q3_architecture",
      phase: "architecture",
      phaseLabel: "System Design & Performance",
      question: `When building web applications that handle large data sets and responsive UI interactions, what performance bottlenecks do you actively monitor, and how do you optimize them?`,
      contextHint: "Discuss render cycles, bundle splitting, Web Vitals (LCP, INP), or API payload strategies.",
      expectedKeywords: ["render", "bundle", "memo", "lazy", "performance", "vitals", "metrics", "network"],
      idealAnswerOutline:
        "Covers both client-side optimizations (code splitting, virtualization, memoization) and network-level improvements (payload compression, edge caching).",
    },
    {
      id: "q4_scenario",
      phase: "scenario",
      phaseLabel: "Situational & Engineering Judgment",
      question: `Imagine you discover a critical regression right before a scheduled production release, but product stakeholders are eager to ship. How do you evaluate the risk and communicate your decision with the team?`,
      contextHint: "Demonstrate engineering maturity, risk triage, rollback strategies, and stakeholder communication.",
      expectedKeywords: ["risk", "stakeholder", "triage", "rollback", "severity", "testing", "communication"],
      idealAnswerOutline:
        "Triage bug severity, evaluate blast radius, communicate transparently with stakeholders offering pragmatic alternatives (feature flags, hotfix timeline), and document root cause.",
    },
    {
      id: "q5_closing",
      phase: "closing",
      phaseLabel: "Engineering Growth & Wrap-up",
      question: `Thank you for those insights. As our final question: what is a recent technical paradigm, library, or engineering practice you have explored, and how does it influence how you write software today?`,
      contextHint: "Show genuine technical curiosity, continuous learning, and practical evaluation of new tech.",
      expectedKeywords: ["learning", "explored", "pattern", "system", "tool", "productivity", "future"],
      idealAnswerOutline:
        "Discusses an emerging practice (e.g., AI-assisted workflows, edge rendering, modern compiler toolchains) with critical reflection on its pros and cons.",
    },
  ];
}

/**
 * Computes an objective, evidence-based scorecard from candidate answers.
 */
export function evaluateInterviewSession(
  candidateName: string,
  targetJobTitle: string,
  questions: InterviewQuestion[],
  answers: Record<string, string>,
  durations: Record<string, number>
): InterviewScorecard {
  let totalTechnical = 0;
  let totalClarity = 0;
  let totalRelevance = 0;
  let totalAnswerCount = 0;

  const totalDurationSeconds = Object.values(durations).reduce((acc, d) => acc + d, 0);
  const minutes = Math.floor(totalDurationSeconds / 60);
  const seconds = totalDurationSeconds % 60;
  const durationFormatted = `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;

  const processedAnswers: CandidateAnswerRecord[] = questions.map((q) => {
    const rawAnswer = (answers[q.id] || "").trim();
    const duration = durations[q.id] || 30;
    const lower = rawAnswer.toLowerCase();

    // 1. Keyword overlap (expand tokens)
    const allTokens = q.expectedKeywords.flatMap((k) => k.toLowerCase().split(/\s+/)).filter((t) => t.length > 2);
    const matchedCount = allTokens.filter((token) => lower.includes(token)).length;
    const tokenRatio = allTokens.length > 0 ? Math.min(1, matchedCount / Math.max(3, allTokens.length * 0.5)) : 0.7;

    // 2. Length & substance
    const wordCount = rawAnswer.split(/\s+/).filter(Boolean).length;
    const hasBasic = wordCount >= 8;
    const hasSubstance = wordCount >= 18;
    const isDetailed = wordCount >= 32;

    // Score calculations (0-100)
    let technicalScore = 0;
    let clarityScore = 0;
    let relevanceScore = 0;
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (wordCount === 0) {
      // Unanswered question
      technicalScore = 0;
      clarityScore = 0;
      relevanceScore = 0;
      strengths.push("No answer recorded for this question.");
      improvements.push("No response was captured. Ensure your microphone is active or type your answer before submitting.");
    } else if (wordCount < 6) {
      // Extremely brief (e.g., "yes", "no", "aws")
      technicalScore = 25;
      clarityScore = 25;
      relevanceScore = 20;
      strengths.push("Acknowledged the topic.");
      improvements.push("Response was too brief (under 6 words). Elaborate on practical implementation details and context.");
    } else {
      technicalScore = Math.min(
        96,
        Math.max(
          40,
          Math.round(
            tokenRatio * 45 +
              (isDetailed ? 38 : hasSubstance ? 32 : hasBasic ? 18 : 0) +
              (matchedCount > 0 ? 15 : 0)
          )
        )
      );
      clarityScore = Math.min(
        96,
        Math.max(40, Math.round(isDetailed ? 90 : hasSubstance ? 84 : hasBasic ? 70 : 40))
      );
      relevanceScore = Math.min(
        95,
        Math.max(35, Math.round(tokenRatio * 50 + (hasSubstance ? 36 : hasBasic ? 20 : 0) + 10))
      );

      if (hasSubstance) {
        strengths.push("Articulated practical experience with context and technical terminology.");
        if (matchedCount >= 2) {
          strengths.push(`Directly addressed target concepts: ${q.expectedKeywords.slice(0, 2).join(", ")}.`);
        }
      } else {
        improvements.push("Response was concise; expand on specific architectural trade-offs and personal ownership.");
      }

      if (!isDetailed) {
        improvements.push("Could provide concrete production metrics or measurable outcomes from past experience.");
      }
    }

    totalTechnical += technicalScore;
    totalClarity += clarityScore;
    totalRelevance += relevanceScore;
    totalAnswerCount++;

    return {
      questionId: q.id,
      question: q.question,
      phaseLabel: q.phaseLabel,
      transcribedAnswer: rawAnswer || "No verbal or typed answer captured during session.",
      durationSeconds: duration,
      metrics: {
        technicalScore,
        clarityScore,
        relevanceScore,
      },
      strengths: strengths.length > 0 ? strengths : ["Demonstrated engagement with the question topic."],
      improvements: improvements.length > 0 ? improvements : ["Provide deeper comparison of alternative approaches."],
      modelAnswer: q.idealAnswerOutline,
    };
  });

  const avgTechnical = Math.round(totalTechnical / (totalAnswerCount || 1));
  const avgClarity = Math.round(totalClarity / (totalAnswerCount || 1));
  const avgRelevance = Math.round(totalRelevance / (totalAnswerCount || 1));
  const avgEvidence = Math.round((avgTechnical + avgRelevance) / 2);

  // Overall Score Formula
  const overall = Math.round(avgTechnical * 0.45 + avgClarity * 0.25 + avgRelevance * 0.2 + avgEvidence * 0.1);
  const clampedOverall = Math.min(98, Math.max(0, overall));

  const verdict: InterviewScorecard["fitVerdict"] =
    clampedOverall >= 75 ? "Strong Fit" : clampedOverall >= 60 ? "Moderate Fit" : "Developing Fit";

  return {
    candidateName,
    targetJobTitle,
    overallScore: clampedOverall,
    fitVerdict: verdict,
    completedAt: new Date().toISOString(),
    durationFormatted,
    categories: {
      technicalAccuracy: avgTechnical,
      communicationClarity: avgClarity,
      problemSolving: avgRelevance,
      practicalEvidence: avgEvidence,
    },
    answers: processedAnswers,
    keyTakeaways: [
      `${candidateName} demonstrated ${verdict === "Strong Fit" ? "rigorous" : "consistent"} communication across the 5 structured evaluation phases.`,
      `Strongest alignment identified in ${avgTechnical >= avgClarity ? "technical depth and system principles" : "clarity of communication and reasoning"}.`,
      `Recommended next step: Proceed to human technical panel with focused questions on real-world system boundary handling.`,
    ],
    recruiterVerificationNotes: [
      "Review response on production risk management (Question 4) during the human panel.",
      "Check portfolio or commit history for code organization patterns mentioned in Question 2.",
    ],
  };
}
