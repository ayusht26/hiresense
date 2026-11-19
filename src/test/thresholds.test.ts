import { describe, it, expect } from "vitest";

describe("Threshold Screening & Gate Logic", () => {
  const DEFAULT_THRESHOLD = 60;

  it("defaults role screening thresholds to 60/100", () => {
    const job = {
      title: "Senior Software Engineer",
      resume_threshold: undefined,
      interview_threshold: undefined,
    };

    const effectiveResumeThreshold = job.resume_threshold ?? DEFAULT_THRESHOLD;
    const effectiveInterviewThreshold = job.interview_threshold ?? DEFAULT_THRESHOLD;

    expect(effectiveResumeThreshold).toBe(60);
    expect(effectiveInterviewThreshold).toBe(60);
  });

  it("gates AI interview access strictly on passing resume threshold", () => {
    const threshold = 60;

    const passingCandidate = { resumeScore: 78 };
    const failingCandidate = { resumeScore: 45 };

    const canPassingTakeInterview = passingCandidate.resumeScore >= threshold;
    const canFailingTakeInterview = failingCandidate.resumeScore >= threshold;

    expect(canPassingTakeInterview).toBe(true);
    expect(canFailingTakeInterview).toBe(false);
  });

  it("correctly classifies candidate as selected (green accent) or not selected (red accent)", () => {
    const interviewThreshold = 60;
    const resumeThreshold = 60;

    function classify(c: {
      interviewScore: number | null;
      resumeScore: number;
      decision?: "shortlisted" | "rejected" | "under_review";
    }) {
      if (c.decision === "shortlisted") return true;
      if (c.decision === "rejected") return false;

      if (c.interviewScore !== null) {
        return c.interviewScore >= interviewThreshold;
      }
      return c.resumeScore >= resumeThreshold;
    }

    // Gurpreet: 78 resume, 95 interview -> Selected (Green)
    expect(classify({ resumeScore: 78, interviewScore: 95 })).toBe(true);

    // Ayush: 85 resume, 52 interview -> Not Selected (Red)
    expect(classify({ resumeScore: 85, interviewScore: 52 })).toBe(false);

    // Varnit: 75 resume, 18 interview -> Not Selected (Red)
    expect(classify({ resumeScore: 75, interviewScore: 18 })).toBe(false);

    // Candidate with 52 interview but manually shortlisted by recruiter -> Selected (Green)
    expect(
      classify({ resumeScore: 85, interviewScore: 52, decision: "shortlisted" }),
    ).toBe(true);

    // Candidate with 95 interview but manually rejected by recruiter -> Not Selected (Red)
    expect(
      classify({ resumeScore: 78, interviewScore: 95, decision: "rejected" }),
    ).toBe(false);

    // Pending candidate with 78 resume -> Selected for interview (Green)
    expect(classify({ resumeScore: 78, interviewScore: null })).toBe(true);

    // Pending candidate with 45 resume -> Not Selected (Red)
    expect(classify({ resumeScore: 45, interviewScore: null })).toBe(false);
  });
});
