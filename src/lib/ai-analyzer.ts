import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { StructuredJobListing, RequirementType } from "@/types/database.types";
import { extractTextFromDocument, extractContactInfo } from "./document-parser";

export interface ScoreBreakdown {
  skills_score: number; // 0-100 (weighted 40%)
  experience_score: number; // 0-100 (weighted 20%)
  project_score: number; // 0-100 (weighted 15%)
  education_score: number; // 0-100 (weighted 10%)
  responsibility_score: number; // 0-100 (weighted 10%)
  evidence_quality_score: number; // 0-100 (weighted 5%)
}

export interface StrengthItem {
  skill_or_area: string;
  category: string;
  evidence_quote: string;
  relevance: string;
}

export interface GapItem {
  requirement: string;
  type: "mandatory" | "preferred";
  severity: "critical" | "moderate" | "minor";
  impact: string;
  recommendation: string;
}

export interface RequirementAuditItem {
  requirement: string;
  type: RequirementType;
  status: "matched" | "partial" | "missing";
  confidence: number; // 0-100
  resume_evidence: string;
}

export interface ResumeAnalysisResult {
  candidate_name: string;
  candidate_email: string;
  target_job_title: string;
  overall_fit_percentage: number; // 0-100
  fit_level: "High Fit" | "Moderate Fit" | "Developing Fit";
  executive_summary: string;
  score_breakdown: ScoreBreakdown;
  strengths: StrengthItem[];
  gaps: GapItem[]; // "What the person is lacking in"
  requirement_matrix: RequirementAuditItem[];
  verification_questions: string[];
  model_used: string;
  analyzed_at: string;
}

export const AnalyzeResumeInputSchema = z.object({
  jobId: z.string().optional().default("demo-job"),
  jobTitle: z.string().min(1, "Job title is required"),
  jobCompany: z.string().min(1, "Company name is required"),
  jobPosting: z.record(z.any()).optional().default({}),
  resumeText: z.string().optional().default(""),
  resumeBase64: z.string().optional().default(""),
  resumeFileName: z.string().optional().default("resume.pdf"),
  candidateName: z.string().optional().default(""),
  candidateEmail: z.string().optional().default(""),
  preferredLanguage: z.enum(["en", "hi", "code_mixed"]).optional().default("en"),
});

export type AnalyzeResumeInput = z.infer<typeof AnalyzeResumeInputSchema>;

/**
 * Deterministic semantic analysis engine fallback.
 * Strictly adheres to the formula in GEMINI.md:
 * Match Score = 0.40 x weighted skill match
 *             + 0.20 x experience fit
 *             + 0.15 x project/role relevance
 *             + 0.10 x education/certification fit
 *             + 0.10 x responsibility semantic match
 *             + 0.05 x evidence quality
 */
export function analyzeResumeDeterministically(
  input: AnalyzeResumeInput,
  resolvedText: string,
  resolvedName: string,
  resolvedEmail: string,
): ResumeAnalysisResult {
  const { jobTitle, jobCompany, jobPosting } = input;
  const resumeText = resolvedText;
  const lowerResume = resumeText.toLowerCase();

  const posting = jobPosting as Partial<StructuredJobListing>;
  const mandatoryQuals = posting.qualifications?.mandatory || [
    "Proficiency in modern TypeScript and React",
    "Experience building responsive web applications",
    "Familiarity with REST APIs and state management",
  ];
  const preferredQuals = posting.qualifications?.preferred || [
    "Experience with Tailwind CSS and Next.js / TanStack",
    "Familiarity with Supabase or PostgreSQL",
  ];
  const techStack = posting.tech_stack || [
    { name: "React", canonical_name: "React", category: "frontend", devicon_slug: "react", requirement_type: "mandatory" as RequirementType },
    { name: "TypeScript", canonical_name: "TypeScript", category: "frontend", devicon_slug: "typescript", requirement_type: "mandatory" as RequirementType },
    { name: "Tailwind CSS", canonical_name: "Tailwind CSS", category: "frontend", devicon_slug: "tailwindcss", requirement_type: "preferred" as RequirementType },
    { name: "Node.js", canonical_name: "Node.js", category: "backend", devicon_slug: "nodejs", requirement_type: "mandatory" as RequirementType },
  ];
  const responsibilities = posting.responsibilities || [
    "Develop and maintain high quality user interfaces",
    "Collaborate with backend teams to integrate APIs",
  ];

  // 1. Skill Matching
  const matrix: RequirementAuditItem[] = [];
  const strengths: StrengthItem[] = [];
  const gaps: GapItem[] = [];

  let mandatoryMatchedCount = 0;
  let preferredMatchedCount = 0;

  // Audit tech stack
  techStack.forEach((tech) => {
    const aliasTerms = [tech.name.toLowerCase(), tech.canonical_name.toLowerCase()];
    if (tech.canonical_name.toLowerCase() === "javascript") aliasTerms.push("js", "es6");
    if (tech.canonical_name.toLowerCase() === "typescript") aliasTerms.push("ts");
    if (tech.canonical_name.toLowerCase() === "postgresql") aliasTerms.push("postgres");
    if (tech.canonical_name.toLowerCase() === "tailwindcss") aliasTerms.push("tailwind");

    const foundTerm = aliasTerms.find((term) => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      return regex.test(resumeText);
    });

    if (foundTerm) {
      if (tech.requirement_type === "mandatory") mandatoryMatchedCount++;
      else preferredMatchedCount++;

      // Extract a line snippet containing the term
      const lines = resumeText.split(/\r?\n/);
      const matchingLine = lines.find((l) => new RegExp(`\\b${foundTerm}\\b`, "i").test(l)) || `${tech.canonical_name} featured in background experience.`;

      matrix.push({
        requirement: `${tech.name} (${tech.category})`,
        type: tech.requirement_type,
        status: "matched",
        confidence: 95,
        resume_evidence: matchingLine.trim().slice(0, 180),
      });

      strengths.push({
        skill_or_area: tech.name,
        category: tech.category,
        evidence_quote: matchingLine.trim().slice(0, 140),
        relevance: `Direct match for target ${tech.requirement_type} tech stack requirement.`,
      });
    } else {
      const isMandatory = tech.requirement_type === "mandatory";
      matrix.push({
        requirement: `${tech.name} (${tech.category})`,
        type: tech.requirement_type,
        status: "missing",
        confidence: 88,
        resume_evidence: "No direct mention or demonstrated evidence found in uploaded resume.",
      });

      gaps.push({
        requirement: tech.name,
        type: isMandatory ? "mandatory" : "preferred",
        severity: isMandatory ? "critical" : "moderate",
        impact: isMandatory
          ? `Core requirement for ${jobTitle}; no direct evidence identified in resume.`
          : `Preferred qualification that adds competitive advantage for this role.`,
        recommendation: `Prepare to discuss any practical or project-based exposure to ${tech.name} during the interview.`,
      });
    }
  });

  // Audit mandatory qualifications
  mandatoryQuals.forEach((qual) => {
    const words = qual.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const matchCount = words.filter((w) => lowerResume.includes(w)).length;
    const isPartial = matchCount >= 1 && matchCount < words.length * 0.6;
    const isMatched = matchCount >= words.length * 0.6;

    if (isMatched) {
      mandatoryMatchedCount++;
      matrix.push({
        requirement: qual,
        type: "mandatory",
        status: "matched",
        confidence: 90,
        resume_evidence: "Demonstrated through relevant responsibilities and project experience.",
      });
    } else if (isPartial) {
      matrix.push({
        requirement: qual,
        type: "mandatory",
        status: "partial",
        confidence: 75,
        resume_evidence: "Partially evident; related skills identified but full depth is unclear.",
      });
      gaps.push({
        requirement: qual,
        type: "mandatory",
        severity: "moderate",
        impact: "Core requirement is only partially verified from resume text.",
        recommendation: "Be prepared to walk through your direct experience regarding this requirement.",
      });
    } else {
      matrix.push({
        requirement: qual,
        type: "mandatory",
        status: "missing",
        confidence: 85,
        resume_evidence: "No direct evidence found in candidate profile.",
      });
      gaps.push({
        requirement: qual,
        type: "mandatory",
        severity: "critical",
        impact: `Mandatory job qualification not explicitly identified in submitted resume.`,
        recommendation: `Review role expectations and prepare portfolio proof or equivalent experience to discuss.`,
      });
    }
  });

  // Audit preferred qualifications
  preferredQuals.forEach((qual) => {
    const words = qual.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const matchCount = words.filter((w) => lowerResume.includes(w)).length;
    if (matchCount >= words.length * 0.5) {
      preferredMatchedCount++;
      matrix.push({
        requirement: qual,
        type: "preferred",
        status: "matched",
        confidence: 85,
        resume_evidence: "Relevant domain knowledge identified in resume.",
      });
    } else {
      matrix.push({
        requirement: qual,
        type: "preferred",
        status: "missing",
        confidence: 80,
        resume_evidence: "Preferred qualification not explicitly mentioned.",
      });
    }
  });

  // Calculate scores
  const totalMandatory = (techStack.filter((t) => t.requirement_type === "mandatory").length + mandatoryQuals.length) || 1;
  const skillsScore = Math.min(100, Math.round((mandatoryMatchedCount / totalMandatory) * 85 + (preferredMatchedCount > 0 ? 15 : 0)));

  // Experience fit
  const expMatches = lowerResume.match(/(\d+)\+?\s*(years?|yrs?)/gi) || [];
  let detectedYears = 0;
  if (expMatches.length > 0) {
    const numbers = expMatches.map((m) => parseInt(m.match(/\d+/)?.[0] || "0", 10));
    detectedYears = Math.max(...numbers);
  }
  const expScore = detectedYears > 0 ? Math.min(100, Math.max(40, detectedYears * 22)) : 50;

  // Project fit
  const hasProjects = lowerResume.includes("project") || lowerResume.includes("built") || lowerResume.includes("architected") || lowerResume.includes("developed");
  const projectScore = hasProjects ? 85 : 55;

  // Education fit
  const hasDegree = lowerResume.includes("bachelor") || lowerResume.includes("master") || lowerResume.includes("b.tech") || lowerResume.includes("b.e.") || lowerResume.includes("computer science") || lowerResume.includes("degree") || lowerResume.includes("b.s.");
  const educationScore = hasDegree ? 90 : 65;

  // Responsibility alignment
  let respMatches = 0;
  responsibilities.forEach((r) => {
    const tokens = r.toLowerCase().split(/\s+/).filter((t) => t.length > 5);
    if (tokens.some((t) => lowerResume.includes(t))) respMatches++;
  });
  const responsibilityScore = Math.min(100, Math.max(40, Math.round((respMatches / (responsibilities.length || 1)) * 90 + 10)));

  // Evidence quality score
  const evidenceQualityScore = resumeText.length > 1200 ? 90 : resumeText.length > 600 ? 75 : 50;

  // Composite Match Score Formula from GEMINI.md:
  const rawScore =
    0.40 * skillsScore +
    0.20 * expScore +
    0.15 * projectScore +
    0.10 * educationScore +
    0.10 * responsibilityScore +
    0.05 * evidenceQualityScore;

  const overallFit = Math.min(98, Math.max(25, Math.round(rawScore)));

  const fitLevel: ResumeAnalysisResult["fit_level"] =
    overallFit >= 78 ? "High Fit" : overallFit >= 60 ? "Moderate Fit" : "Developing Fit";

  // Verification questions
  const verificationQuestions = [
    `Can you describe an architectural challenge you resolved in your recent projects?`,
    gaps.length > 0
      ? `The role expects experience with ${gaps[0].requirement}. What is your familiarity with this technology?`
      : `How do you approach automated testing and performance optimization in your stack?`,
    `Walk us through a technical project you built from scratch that you are proud of.`,
  ];

  return {
    candidate_name: resolvedName,
    candidate_email: resolvedEmail,
    target_job_title: jobTitle,
    overall_fit_percentage: overallFit,
    fit_level: fitLevel,
    executive_summary: `${resolvedName} demonstrates ${overallFit >= 75 ? "strong" : overallFit >= 55 ? "moderate" : "developing"} alignment with the ${jobTitle} position. ${strengths.length > 0 ? `Key verified proficiencies include ${strengths.slice(0, 3).map((s) => s.skill_or_area).join(", ")}.` : ""} ${gaps.length > 0 ? `Identified growth areas to verify: ${gaps.slice(0, 2).map((g) => g.requirement).join(" and ")}.` : "Candidate profile shows comprehensive coverage for primary qualifications."}`,
    score_breakdown: {
      skills_score: skillsScore,
      experience_score: expScore,
      project_score: projectScore,
      education_score: educationScore,
      responsibility_score: responsibilityScore,
      evidence_quality_score: evidenceQualityScore,
    },
    strengths,
    gaps,
    requirement_matrix: matrix,
    verification_questions: verificationQuestions,
    model_used: "HireSense Semantic Evidence Engine",
    analyzed_at: new Date().toISOString(),
  };
}

/**
 * Perform AI resume analysis via OpenAI or Gemini, with deterministic fallback.
 */
export async function executeAiResumeAnalysis(input: AnalyzeResumeInput): Promise<ResumeAnalysisResult> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  // 1. Resolve Resume Text (extract from base64 if needed)
  let resumeContent = input.resumeText?.trim() || "";
  if (input.resumeBase64 && resumeContent.length < 50) {
    try {
      const buffer = Buffer.from(input.resumeBase64, "base64");
      const extracted = await extractTextFromDocument(
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        input.resumeFileName || "resume.pdf",
      );
      if (extracted && extracted.length > 20) {
        resumeContent = extracted;
      }
    } catch (docErr) {
      console.warn("Server document parsing fallback:", docErr);
    }
  }

  // 2. Resolve Candidate Identity from Resume Text
  const detected = extractContactInfo(resumeContent);
  const resolvedName =
    input.candidateName && input.candidateName !== "Applicant" && input.candidateName !== "Aarav Sharma"
      ? input.candidateName
      : detected.name || input.candidateName || "Candidate";

  const resolvedEmail =
    input.candidateEmail && input.candidateEmail !== "aarav.sharma@example.com"
      ? input.candidateEmail
      : detected.email || input.candidateEmail || "";

  const systemPrompt = `You are HireSense's AI Recruitment & Resume Intelligence Engine.
Analyze the candidate's actual resume strictly and objectively against the target Job Requirements.
Calculate an evidence-backed compatibility score between 0 and 100 based on the formula:
Match Score = 0.40 x weighted skill match + 0.20 x experience fit + 0.15 x project relevance + 0.10 x education fit + 0.10 x responsibility match + 0.05 x evidence quality.

CRITICAL RULES:
1. DYNAMIC INDIVIDUAL SCORING:
   - Calculate an accurate score reflecting THIS SPECIFIC candidate.
   - Do NOT default to 85% or any fixed template score.
   - If the candidate lacks mandatory requirements or has junior experience for a senior role, assign an honest, lower score (e.g. 35%, 45%, 58%, 68%).
   - If the candidate is a strong match, assign an appropriate high score (e.g. 82%, 91%).
   - The sub-scores must also vary realistically based on their specific background.
2. CANDIDATE IDENTITY:
   - Extract the candidate's real name and contact details directly from the provided resume text.
   - Do NOT invent or output "Aarav Sharma" or "John Doe" unless that exact name is in the resume text!
3. "What the person has" (strengths): Identify skills explicitly evidenced in the resume with verbatim quote spans from their work experience or projects.
4. "What the person is lacking in" (gaps): Specifically identify which mandatory and preferred qualifications the candidate lacks or has minimal evidence of. Assign severity ("critical" for mandatory gaps, "moderate" for preferred gaps, "minor" for soft skills). Give concrete actionable recommendations for each gap.
5. Be completely transparent, objective, and truthful to the provided text.

Return ONLY a valid JSON object strictly matching this JSON schema:
{
  "candidate_name": string,
  "candidate_email": string,
  "target_job_title": string,
  "overall_fit_percentage": number (0 to 100),
  "fit_level": "High Fit" | "Moderate Fit" | "Developing Fit",
  "executive_summary": string,
  "score_breakdown": {
    "skills_score": number,
    "experience_score": number,
    "project_score": number,
    "education_score": number,
    "responsibility_score": number,
    "evidence_quality_score": number
  },
  "strengths": [
    {
      "skill_or_area": string,
      "category": string,
      "evidence_quote": string,
      "relevance": string
    }
  ],
  "gaps": [
    {
      "requirement": string,
      "type": "mandatory" | "preferred",
      "severity": "critical" | "moderate" | "minor",
      "impact": string,
      "recommendation": string
    }
  ],
  "requirement_matrix": [
    {
      "requirement": string,
      "type": "mandatory" | "preferred" | "contextual" | "informational",
      "status": "matched" | "partial" | "missing",
      "confidence": number,
      "resume_evidence": string
    }
  ],
  "verification_questions": [string]
}`;

  const userPrompt = `TARGET JOB:
Title: ${input.jobTitle}
Company: ${input.jobCompany}
Job Profile: ${JSON.stringify(input.jobPosting, null, 2)}

CANDIDATE SUBMITTED RESUME:
Candidate Name Provided: ${resolvedName}
Candidate Email Provided: ${resolvedEmail}
Resume File: ${input.resumeFileName}

FULL RESUME TEXT CONTENT:
${resumeContent.slice(0, 15000)}`;

  // 1. Try OpenAI if key is present
  if (openAiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as ResumeAnalysisResult;
          parsed.model_used = "OpenAI gpt-4o-mini";
          parsed.analyzed_at = new Date().toISOString();
          // Ensure detected name is kept if LLM reverted to placeholder
          if (parsed.candidate_name === "Aarav Sharma" && resolvedName !== "Aarav Sharma") {
            parsed.candidate_name = resolvedName;
          }
          return parsed;
        }
      }
    } catch (openAiErr) {
      console.warn("OpenAI resume analysis fallback:", openAiErr);
    }
  }

  // 2. Try Gemini if key is present
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: userPrompt },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as ResumeAnalysisResult;
          parsed.model_used = "Google Gemini 3.8 Flash";
          parsed.analyzed_at = new Date().toISOString();
          if (parsed.candidate_name === "Aarav Sharma" && resolvedName !== "Aarav Sharma") {
            parsed.candidate_name = resolvedName;
          }
          return parsed;
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini resume analysis fallback:", geminiErr);
    }
  }

  // 3. Fallback to deterministic semantic analyzer with resolved text & name
  return analyzeResumeDeterministically(input, resumeContent, resolvedName, resolvedEmail);
}

/**
 * Server function to analyze a candidate resume against a job.
 */
export const analyzeResumeServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => AnalyzeResumeInputSchema.parse(data))
  .handler(async ({ data }): Promise<ResumeAnalysisResult> => {
    return executeAiResumeAnalysis(data);
  });
