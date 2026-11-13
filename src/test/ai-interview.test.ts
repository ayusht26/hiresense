import { describe, it, expect } from "vitest";
import {
  generateInterviewQuestions,
  evaluateInterviewSession,
} from "@/lib/ai-interview";

describe("AI Interview Engine (Mira Persona)", () => {
  it("generates 5 role-grounded structured interview questions", () => {
    const jobPosting = {
      qualifications: {
        mandatory: ["TypeScript & React experience", "Deep state management knowledge"],
      },
      tech_stack: [
        { name: "React", requirement_type: "mandatory" },
        { name: "TypeScript", requirement_type: "mandatory" },
        { name: "Tailwind CSS", requirement_type: "preferred" },
      ],
    };

    const questions = generateInterviewQuestions("Senior Frontend Engineer", jobPosting);

    expect(questions).toHaveLength(5);
    expect(questions[0].phase).toBe("intro");
    expect(questions[1].phase).toBe("technical");
    expect(questions[2].phase).toBe("architecture");
    expect(questions[3].phase).toBe("scenario");
    expect(questions[4].phase).toBe("closing");

    expect(questions[0].question).toContain("Mira");
    expect(questions[0].question).toContain("Senior Frontend Engineer");
  });

  it("evaluates candidate answers and produces an objective evidence scorecard", () => {
    const questions = generateInterviewQuestions("Frontend Engineer");

    const answers = {
      q1_intro:
        "I have 4 years of experience as a software engineer where I designed and built large scale React web applications with clean architecture and state management.",
      q2_technical:
        "For state management and caching, I implement React Query and TanStack. I handle race conditions using AbortController cancel tokens and atomic state updates.",
      q3_architecture:
        "I monitor Core Web Vitals including LCP and INP. I optimize through component lazy loading, bundle splitting, and virtualizing large data tables.",
      q4_scenario:
        "I first triage bug severity and blast radius. I communicate transparently with stakeholders, evaluate rollback strategies, and use feature flags.",
      q5_closing:
        "I have been exploring edge rendering and compiler architectures to improve client bundle performance and productivity.",
    };

    const durations = {
      q1_intro: 45,
      q2_technical: 60,
      q3_architecture: 55,
      q4_scenario: 50,
      q5_closing: 40,
    };

    const scorecard = evaluateInterviewSession(
      "Aarav Sharma",
      "Frontend Engineer",
      questions,
      answers,
      durations
    );

    expect(scorecard.candidateName).toBe("Aarav Sharma");
    expect(scorecard.targetJobTitle).toBe("Frontend Engineer");
    expect(scorecard.overallScore).toBeGreaterThanOrEqual(75);
    expect(scorecard.fitVerdict).toBe("Strong Fit");
    expect(scorecard.answers).toHaveLength(5);
    expect(scorecard.categories.technicalAccuracy).toBeGreaterThan(0);
    expect(scorecard.categories.communicationClarity).toBeGreaterThan(0);
    expect(scorecard.categories.problemSolving).toBeGreaterThan(0);
    expect(scorecard.keyTakeaways.length).toBeGreaterThan(0);
    expect(scorecard.recruiterVerificationNotes.length).toBeGreaterThan(0);
  });

  it("assigns 0 score when candidate leaves questions unanswered or without captured speech", () => {
    const questions = generateInterviewQuestions("Senior Frontend Engineer");
    const emptyAnswers = {
      q1_intro: "",
      q2_technical: "",
      q3_architecture: "",
      q4_scenario: "",
      q5_closing: "",
    };
    const durations = { q1_intro: 10, q2_technical: 10, q3_architecture: 10, q4_scenario: 10, q5_closing: 10 };

    const scorecard = evaluateInterviewSession(
      "Test Candidate",
      "Senior Frontend Engineer",
      questions,
      emptyAnswers,
      durations
    );

    expect(scorecard.overallScore).toBe(0);
    expect(scorecard.categories.technicalAccuracy).toBe(0);
    expect(scorecard.categories.communicationClarity).toBe(0);
    expect(scorecard.categories.problemSolving).toBe(0);
    expect(scorecard.answers[0].metrics.technicalScore).toBe(0);
    expect(scorecard.answers[0].strengths[0]).toContain("No answer recorded");
  });
});
