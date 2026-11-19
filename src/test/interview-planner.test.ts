import { describe, it, expect } from "vitest";
import {
  generateInterviewQuestions,
  detectLevel,
  validatePlan,
  type PlanContext,
} from "@/lib/interview-planner";

describe("Interview Planner (src/lib/interview-planner.ts)", () => {
  it("generates 5 role-grounded questions for Junior Software Engineer – DSA (Fresher)", () => {
    const jobPosting = {
      company: "Acme Corp",
      experience: "0-1 years",
      tech_stack: [
        { name: "Python", canonical_name: "Python", requirement_type: "mandatory" },
        { name: "DSA", canonical_name: "DSA", requirement_type: "mandatory" },
      ],
      responsibilities: ["Implement clean algorithms and maintain data pipelines."],
    };

    const questions = generateInterviewQuestions(
      "Junior Software Engineer – DSA (Fresher)",
      jobPosting,
    );

    expect(questions).toHaveLength(5);
    expect(questions[0]?.phase).toBe("intro");
    expect(questions[1]?.phase).toBe("technical");
    expect(questions[2]?.phase).toBe("architecture");
    expect(questions[3]?.phase).toBe("scenario");
    expect(questions[4]?.phase).toBe("closing");

    // Intro contains Bable and the title
    expect(questions[0]?.question).toContain("Bable");
    expect(questions[0]?.question).toContain("Junior Software Engineer – DSA (Fresher)");

    // None of the questions contain old dataset companies
    for (const q of questions) {
      expect(q.question).not.toContain("Square");
      expect(q.question).not.toContain("Mastercard");
      expect(q.question).not.toContain("PayPal");
    }

    // Technical question contains DSA or Python
    const techText = questions[1]?.question || "";
    expect(techText.toLowerCase()).toMatch(/python|dsa|data structure|algorithm/);
  });

  it("quotes resume text in slot 3 when analysis evidence is provided", () => {
    const quote = "Architected asynchronous queue processing pipeline with Celery";
    const ctx: PlanContext = {
      analysis: {
        executive_summary: "Experienced backend engineer",
        strengths: [
          {
            skill_or_area: "Queue Architecture",
            evidence_quote: quote,
          },
        ],
        gaps: [],
        verification_questions: [],
      },
    };

    const questions = generateInterviewQuestions("Backend Engineer", {}, ctx);
    expect(questions[2]?.phase).toBe("architecture");
    expect(questions[2]?.question).toContain(quote);
    expect(questions[2]?.groundedIn).toContain(quote);
  });

  it("detects role level accurately across various titles and experience strings", () => {
    expect(detectLevel("0-1 years", "Junior Frontend Developer")).toBe("entry");
    expect(detectLevel("Fresher", "Software Engineer")).toBe("entry");
    expect(detectLevel("", "Intern Software Engineer")).toBe("entry");
    expect(detectLevel("5+ years", "Senior Fullstack Engineer")).toBe("senior");
    expect(detectLevel("6-8 years", "Lead Systems Architect")).toBe("senior");
    expect(detectLevel("3 years", "Software Engineer")).toBe("mid");
  });

  it("is deterministic for identical input", () => {
    const jobPosting = {
      company: "HireSense Labs",
      experience: "2-4 years",
      tech_stack: [
        { name: "React", requirement_type: "mandatory" },
        { name: "TypeScript", requirement_type: "mandatory" },
      ],
    };

    const plan1 = generateInterviewQuestions("Frontend Engineer", jobPosting);
    const plan2 = generateInterviewQuestions("Frontend Engineer", jobPosting);

    expect(plan1.map((q) => q.question)).toEqual(plan2.map((q) => q.question));
  });

  it("validatePlan rejects invalid plan, off-topic question, or blocked company names", () => {
    const jobPosting = {
      company: "Local Startup",
      tech_stack: [{ name: "React", requirement_type: "mandatory" }],
    };

    // Valid plan
    const validPlan = generateInterviewQuestions("Frontend Engineer", jobPosting);
    const validRes = validatePlan(validPlan, "Frontend Engineer", jobPosting);
    expect(validRes.valid).toBe(true);

    // Plan with blocked company
    const badPlan = [...validPlan];
    badPlan[1] = {
      ...badPlan[1]!,
      question: "How did you scale the payment system at Square with Python?",
    };
    const badRes = validatePlan(badPlan, "Frontend Engineer", jobPosting);
    expect(badRes.valid).toBe(false);
    expect(badRes.errors.some((e) => e.toLowerCase().includes("square"))).toBe(true);
  });

  it("generates Hindi questions with Devanagari script and English technical terms", () => {
    const jobPosting = {
      company: "टेकफ्लो",
      tech_stack: [{ name: "PostgreSQL", requirement_type: "mandatory" }],
    };

    const questions = generateInterviewQuestions("Database Administrator", jobPosting, {
      language: "hi",
    });

    expect(questions).toHaveLength(5);
    expect(questions[0]?.question).toContain("बेबल");
    expect(questions[0]?.question).toContain("Database Administrator");
    // Technical terms remain in Latin script
    expect(questions[1]?.question).toContain("PostgreSQL");
  });

  it("generates Hinglish questions in Roman script with Hindi conversational markers", () => {
    const jobPosting = {
      company: "Infosys",
      tech_stack: [{ name: "React", requirement_type: "mandatory" }],
    };

    const questions = generateInterviewQuestions("Frontend Developer", jobPosting, {
      language: "hinglish",
    });

    expect(questions).toHaveLength(5);
    expect(questions[0]?.question).toContain("Bable");
    expect(questions[0]?.question).toContain("swagat");
    expect(questions[1]?.question).toContain("React");
  });
});
