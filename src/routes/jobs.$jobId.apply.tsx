import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Sparkles,
  RefreshCw,
  Building2,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Job, StructuredJobListing } from "@/types/database.types";
import { CompanyLogo } from "@/components/CompanyLogo";
import { TechLogoTile } from "@/components/TechLogoTile";
import { ResumeUploadCard, type ResumeUploadData } from "@/components/analyzer/ResumeUploadCard";
import { AnalysisScoreCard } from "@/components/analyzer/AnalysisScoreCard";
import { AnalysisStrengthsGaps } from "@/components/analyzer/AnalysisStrengthsGaps";
import { RequirementMatrixCard } from "@/components/analyzer/RequirementMatrixCard";
import { InterviewLaunchCard } from "@/components/analyzer/InterviewLaunchCard";
import {
  analyzeResumeServerFn,
  analyzeResumeDeterministically,
  type ResumeAnalysisResult,
} from "@/lib/ai-analyzer";

export const Route = createFileRoute("/jobs/$jobId/apply")({
  head: () => ({
    meta: [
      { title: "Resume Analyzer & Application — HireSense" },
      {
        name: "description",
        content: "Transparent AI resume matching, qualification audit, and compatibility fit.",
      },
    ],
  }),
  component: JobApplyPage,
});

// Fallback demo job when database has no record for the requested jobId
const DEMO_JOB_FALLBACK: Job = {
  id: "demo-frontend-engineer",
  title: "Senior Frontend Engineer",
  company_name: "TechFlow Innovations",
  recruiter_id: "demo-recruiter",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: "published",
  job_type: "Full-time",
  location: "Bengaluru, India",
  work_mode: "hybrid",
  experience: "3+ years",
  salary_min: 1800000,
  salary_max: 2800000,
  salary_currency: "INR",
  salary_period: "year",
  salary_display: "₹18,00,000 – ₹28,00,000 / year",
  raw_input: null,
  model_name: "HireSense Hybrid Structurer",
  prompt_version: "v1.0.0",
  generated_posting: {
    title: "Senior Frontend Engineer",
    company: "TechFlow Innovations",
    location: "Bengaluru, India",
    work_mode: "hybrid",
    employment_type: "Full-time",
    experience: "3+ years",
    salary: {
      min: 1800000,
      max: 2800000,
      currency: "INR",
      period: "year",
      display: "₹18,00,000 – ₹28,00,000 / year",
    },
    about_role:
      "Join TechFlow Innovations as a Senior Frontend Engineer to architect performant, accessible web applications and developer tools using React 19, TypeScript, and modern component systems.",
    responsibilities: [
      "Architect and build high-performance client web applications using React and TypeScript.",
      "Implement accessible, WCAG-compliant design systems with Tailwind CSS and Framer Motion.",
      "Integrate complex REST APIs with robust cache management using React Query / TanStack.",
      "Collaborate with backend teams to establish clean API contracts and state synchronization.",
    ],
    qualifications: {
      mandatory: [
        "Strong production experience with modern TypeScript and React (3+ years).",
        "Deep understanding of web performance, bundle optimization, and component lifecycle.",
        "Demonstrated experience with RESTful API architecture and asynchronous state.",
      ],
      preferred: [
        "Hands-on experience with Next.js or TanStack Start / Router.",
        "Familiarity with Tailwind CSS and component animation libraries.",
        "Familiarity with containerized workflows (Docker) and CI/CD pipelines.",
      ],
    },
    tech_stack: [
      {
        name: "React",
        canonical_name: "React",
        category: "frontend",
        devicon_slug: "react",
        requirement_type: "mandatory",
      },
      {
        name: "TypeScript",
        canonical_name: "TypeScript",
        category: "frontend",
        devicon_slug: "typescript",
        requirement_type: "mandatory",
      },
      {
        name: "Tailwind CSS",
        canonical_name: "Tailwind CSS",
        category: "frontend",
        devicon_slug: "tailwindcss",
        requirement_type: "preferred",
      },
      {
        name: "Node.js",
        canonical_name: "Node.js",
        category: "backend",
        devicon_slug: "nodejs",
        requirement_type: "mandatory",
      },
      {
        name: "Docker",
        canonical_name: "Docker",
        category: "devops",
        devicon_slug: "docker",
        requirement_type: "preferred",
      },
    ],
    benefits: [
      "Competitive salary with performance bonuses and ESOP equity.",
      "Comprehensive medical insurance for employee and dependents.",
      "Flexible hybrid working schedule (2 days remote per week).",
    ],
  },
};

function JobApplyPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job>(DEMO_JOB_FALLBACK);
  const [jobLoading, setJobLoading] = useState(true);

  // Application state: "input" | "analyzing" | "result"
  const [stage, setStage] = useState<"input" | "analyzing" | "result">("input");
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch job from Supabase
  useEffect(() => {
    async function fetchJob() {
      try {
        setJobLoading(true);
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .maybeSingle();

        if (data && !error) {
          setJob(data as Job);
        } else {
          // Keep demo fallback
          setJob(DEMO_JOB_FALLBACK);
        }
      } catch (err) {
        console.warn("Could not load job from database, using fallback:", err);
        setJob(DEMO_JOB_FALLBACK);
      } finally {
        setJobLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  // Handle resume submission and AI analysis
  const handleAnalyzeResume = async (uploadData: ResumeUploadData) => {
    setError(null);
    setStage("analyzing");
    setAnalyzingStep(0);

    // Sequence progress indicators
    const t1 = setTimeout(() => setAnalyzingStep(1), 800);
    const t2 = setTimeout(() => setAnalyzingStep(2), 1800);
    const t3 = setTimeout(() => setAnalyzingStep(3), 2800);

    try {
      const payload = {
        jobId: job.id,
        jobTitle: job.title,
        jobCompany: job.company_name,
        jobPosting: (job.generated_posting as any) || {},
        resumeText: uploadData.resumeText,
        resumeBase64: uploadData.resumeBase64 || "",
        resumeFileName: uploadData.fileName,
        candidateName: uploadData.candidateName,
        candidateEmail: uploadData.candidateEmail,
        preferredLanguage: uploadData.preferredLanguage,
      };

      let result: ResumeAnalysisResult;

      try {
        result = await analyzeResumeServerFn({ data: payload });
      } catch (serverErr) {
        console.warn("ServerFn fallback to client deterministic analyzer:", serverErr);
        result = analyzeResumeDeterministically(
          payload,
          uploadData.resumeText,
          uploadData.candidateName || "Candidate",
          uploadData.candidateEmail || "",
        );
      }

      // Persist application if user is logged in
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("applications").insert({
            job_id: job.id,
            student_id: user.id,
            match_score: result.overall_fit_percentage,
            match_report: result as any,
            status: "screened",
            result_published: true,
          });
        }
      } catch (dbErr) {
        console.warn("Could not save application record:", dbErr);
      }

      setAnalysisResult(result);
      setStage("result");
    } catch (err: any) {
      console.error("Resume analysis failure:", err);
      setError(err?.message || "Failed to analyze resume. Please try again.");
      setStage("input");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    }
  };

  const structured = (job.generated_posting || {}) as Partial<StructuredJobListing>;
  const location = job.location || structured.location || "Bengaluru, India";
  const salary = job.salary_display || structured.salary?.display || "Competitive";
  const workMode = job.work_mode || structured.work_mode || "Hybrid";

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between selection:bg-[#f5f5f5] selection:text-[#0a0a0a]">
      {/* Background Dot Grid */}
      <div aria-hidden className="dot-grid fixed inset-0 pointer-events-none opacity-40 z-0" />

      {/* Top Floating Pill Navigation */}
      <header className="relative pt-6 sm:pt-8 px-4 flex justify-center w-full z-20">
        <nav
          aria-label="Application navigation"
          className="flex h-12 w-full max-w-[800px] items-center justify-between rounded-full bg-[#141414] px-6 border border-[rgba(255,255,255,0.10)]"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[14px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
          >
            <ArrowLeft size={16} />
            <span>Back to jobs</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 text-[15px] font-[650] tracking-tight text-[#f5f5f5] transition-opacity hover:opacity-80"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-[30%] bg-[#f5f5f5] text-[12px] font-[700] text-[#0a0a0a]">
              H
            </div>
            <span>HireSense</span>
          </Link>

          <span className="text-[12px] font-[600] px-3 py-1 rounded-full bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)]">
            Stage 2 · Screening
          </span>
        </nav>
      </header>

      {/* Main Workspace */}
      <main className="relative z-10 flex-1 max-w-[1080px] w-full mx-auto px-4 pt-8 pb-16 space-y-8">
        {/* Target Job Header Card */}
        <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CompanyLogo name={job.company_name} size="sm" />
              <div>
                <span className="text-[12px] font-[600] text-[#8a8a8a]">Applying for position</span>
                <h1 className="text-[22px] sm:text-[26px] font-[650] text-[#f5f5f5] tracking-tight leading-tight">
                  {job.title}.
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#1a1a1a] text-[12px] font-[450] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)] capitalize">
                {workMode}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-[#f5f5f5] border border-[rgba(255,255,255,0.08)]">
                {salary}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[13px] text-[#8a8a8a] flex-wrap border-t border-[rgba(255,255,255,0.06)] pt-3.5">
            <span className="font-[600] text-[#f5f5f5]">{job.company_name}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} />
              <span>{location}</span>
            </span>
            <span>•</span>
            <span>Experience: {job.experience || "3+ years"}</span>
          </div>
        </div>

        {/* Dynamic State 1: Input / Upload */}
        {stage === "input" && (
          <ResumeUploadCard
            onAnalyze={handleAnalyzeResume}
            isLoading={false}
            jobTitle={job.title}
            companyName={job.company_name}
          />
        )}

        {/* Dynamic State 2: AI Analyzing Animation */}
        {stage === "analyzing" && (
          <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-12 text-center space-y-6 max-w-lg mx-auto my-12 shadow-2xl">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[30%] bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] text-[#f5f5f5]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.15)] border-t-[#f5f5f5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-[22px] font-[650] text-[#f5f5f5] tracking-tight">
                Evaluating resume with AI.
              </h3>
              <p className="text-[14px] text-[#8a8a8a]">
                Running semantic entity extraction and requirement audit matrix.
              </p>
            </div>

            {/* Sequence indicators */}
            <div className="rounded-[16px] bg-[#1a1a1a] p-4 text-left space-y-2.5 text-[13px] border border-[rgba(255,255,255,0.06)]">
              <div
                className={`flex items-center gap-2.5 transition-colors ${
                  analyzingStep >= 0 ? "text-[#f5f5f5]" : "text-[#5c5c5c]"
                }`}
              >
                <CheckCircle2
                  size={15}
                  className={analyzingStep >= 0 ? "text-emerald-400" : "text-[#5c5c5c]"}
                />
                <span>Extracting candidate skills and source text spans...</span>
              </div>

              <div
                className={`flex items-center gap-2.5 transition-colors ${
                  analyzingStep >= 1 ? "text-[#f5f5f5]" : "text-[#5c5c5c]"
                }`}
              >
                <CheckCircle2
                  size={15}
                  className={analyzingStep >= 1 ? "text-emerald-400" : "text-[#5c5c5c]"}
                />
                <span>Normalizing technical aliases against job requirement profile...</span>
              </div>

              <div
                className={`flex items-center gap-2.5 transition-colors ${
                  analyzingStep >= 2 ? "text-[#f5f5f5]" : "text-[#5c5c5c]"
                }`}
              >
                <CheckCircle2
                  size={15}
                  className={analyzingStep >= 2 ? "text-emerald-400" : "text-[#5c5c5c]"}
                />
                <span>Cross-referencing mandatory gates and experience depth...</span>
              </div>

              <div
                className={`flex items-center gap-2.5 transition-colors ${
                  analyzingStep >= 3 ? "text-[#f5f5f5]" : "text-[#5c5c5c]"
                }`}
              >
                <CheckCircle2
                  size={15}
                  className={analyzingStep >= 3 ? "text-emerald-400" : "text-[#5c5c5c]"}
                />
                <span>Calculating hybrid match score and identifying gaps...</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic State 3: Analysis Results Dashboard */}
        {stage === "result" && analysisResult && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Action Bar: Re-upload toggle */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[13px] font-[600] text-[#f5f5f5]">
                  Analysis Complete for {analysisResult.candidate_name}
                </span>
                <span className="text-[12px] text-[#707070]">
                  ({new Date(analysisResult.analyzed_at).toLocaleTimeString()})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setStage("input")}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] px-4 text-[12px] font-[600] text-[#f5f5f5] hover:bg-[#262626] transition-colors"
              >
                <RefreshCw size={13} />
                <span>Upload different resume</span>
              </button>
            </div>

            {/* 1. Overall Score & Category Breakdown */}
            <AnalysisScoreCard
              score={analysisResult.overall_fit_percentage}
              fitLevel={analysisResult.fit_level}
              breakdown={analysisResult.score_breakdown}
              targetJobTitle={job.title}
              candidateName={analysisResult.candidate_name}
              modelUsed={analysisResult.model_used}
            />

            {/* 2. Executive Summary & "What you have" vs "What you are lacking in" */}
            <AnalysisStrengthsGaps
              summary={analysisResult.executive_summary}
              strengths={analysisResult.strengths}
              gaps={analysisResult.gaps}
            />

            {/* 3. Requirement-by-Requirement Audit Matrix */}
            <RequirementMatrixCard matrix={analysisResult.requirement_matrix} />

            {/* 4. Option to Start the AI Interview (as requested by user) */}
            <InterviewLaunchCard
              candidateName={analysisResult.candidate_name}
              targetJobTitle={job.title}
              preferredLanguage="en"
              verificationQuestions={analysisResult.verification_questions}
            />
          </div>
        )}

        {error && (
          <div className="rounded-[16px] bg-red-500/10 border border-red-500/30 p-4 text-[13px] text-red-400 text-center">
            {error}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-6 px-4 text-center border-t border-[rgba(255,255,255,0.06)] mt-8">
        <p className="text-[12px] font-[450] text-[#707070]">
          <span>© 2026 HireSense Inc.</span>
          <span className="mx-2">·</span>
          <span>Resume Analyzer & Application Pipeline</span>
          <span className="mx-2">·</span>
          <span>People make every decision.</span>
        </p>
      </footer>
    </div>
  );
}
