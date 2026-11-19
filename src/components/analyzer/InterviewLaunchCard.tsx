import { useState } from "react";
import {
  Video,
  Languages,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
} from "lucide-react";
import { AiInterviewRoom } from "@/components/interview/AiInterviewRoom";
import { recordConsentAndLanguage } from "@/lib/applications";
import type { PlanContext } from "@/lib/interview-planner";

interface InterviewLaunchCardProps {
  userId?: string;
  jobId?: string;
  candidateName: string;
  targetJobTitle: string;
  jobPosting?: Record<string, unknown>;
  preferredLanguage?: "en" | "hi" | "hinglish";
  verificationQuestions?: string[];
  analysis?: PlanContext["analysis"];
  resumeScore?: number;
  resumeThreshold?: number;
  interviewThreshold?: number;
}

export function InterviewLaunchCard({
  userId = "guest_user",
  jobId = "demo-job",
  candidateName,
  targetJobTitle,
  jobPosting = {},
  preferredLanguage = "en",
  verificationQuestions = [],
  analysis,
  resumeScore,
  resumeThreshold = 60,
  interviewThreshold = 60,
}: InterviewLaunchCardProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "hinglish">(
    preferredLanguage,
  );
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);

  const effectiveResumeScore = resumeScore ?? analysis?.overall_fit_percentage ?? 0;
  const isPassed = effectiveResumeScore >= resumeThreshold;

  const handleStart = () => {
    if (!isPassed) return;
    // Record consent and language in persistence
    recordConsentAndLanguage(userId, jobId, selectedLanguage);
    setIsInterviewOpen(true);
  };

  return (
    <>
      <div
        className={`rounded-[24px] bg-[#141414] border p-6 sm:p-8 space-y-6 transition-all ${
          isPassed
            ? "border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.03] to-transparent"
            : "border-rose-500/25 bg-gradient-to-b from-rose-500/[0.03] to-transparent"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {isPassed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-[11px] font-[600] text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={12} />
                  <span>Resume Passed ({effectiveResumeScore} / 100 · Threshold: {resumeThreshold})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-[11px] font-[600] text-rose-400 border border-rose-500/20">
                  <AlertCircle size={12} />
                  <span>Resume Threshold Not Met ({effectiveResumeScore} / 100 · Required: {resumeThreshold})</span>
                </span>
              )}
              <span className="text-[11px] font-[500] text-[#707070]">
                Step 2 of 2 · AI Assessment
              </span>
            </div>

            <h3 className="text-[22px] sm:text-[26px] font-[650] tracking-tight text-[#f5f5f5]">
              {isPassed ? "Ready to start your interview." : "Interview locked."}
            </h3>
            <p className="mt-1 text-[14px] font-[450] text-[#8a8a8a] leading-relaxed max-w-2xl">
              {isPassed ? (
                <>
                  Screening passed. You met the role&apos;s resume threshold of{" "}
                  <span className="text-[#f5f5f5] font-[600]">{resumeThreshold}/100</span> (scored{" "}
                  <span className="text-emerald-400 font-[650]">{effectiveResumeScore}/100</span>) and may proceed directly to the conversational AI interview for{" "}
                  <span className="text-[#f5f5f5] font-[600]">{targetJobTitle}</span>.
                </>
              ) : (
                <>
                  This role requires a minimum resume screening score of{" "}
                  <span className="text-[#f5f5f5] font-[650]">{resumeThreshold}/100</span>. Your evaluated resume fit is{" "}
                  <span className="text-rose-400 font-[650]">{effectiveResumeScore}/100</span>. Once a candidate passes the resume threshold then only can they give the interview.
                </>
              )}
            </p>
          </div>

          {/* Primary Action Button */}
          {isPassed ? (
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f5f5f5] px-8 text-[15px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98] self-start sm:self-center shrink-0 shadow-lg"
            >
              <span>Start AI interview</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex flex-col items-start sm:items-end gap-1.5 self-start sm:self-center shrink-0">
              <button
                type="button"
                disabled
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1a1a1a] border border-rose-500/30 px-6 text-[14px] font-[600] text-rose-400/90 cursor-not-allowed opacity-90 shadow-none"
              >
                <Lock size={15} />
                <span>Interview locked ({effectiveResumeScore}/{resumeThreshold})</span>
              </button>
              <span className="text-[11px] text-[#707070]">
                Threshold: {resumeThreshold} / 100 required
              </span>
            </div>
          )}
        </div>

        {/* If threshold not met, show actionable message */}
        {!isPassed && (
          <div className="rounded-[16px] bg-rose-500/[0.04] border border-rose-500/20 p-4 text-[13px] text-[#8a8a8a] space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 text-rose-400 font-[600]">
              <Lock size={14} />
              <span>How to unlock the interview</span>
            </div>
            <p>
              Review the requirement gaps and missing skills identified above, update your resume to reflect your relevant experience, and click <strong className="text-[#f5f5f5]">&quot;Replace resume&quot;</strong> above to re-evaluate your compatibility score.
            </p>
          </div>
        )}

        {/* Interview Configuration Grid (Only enabled if passed) */}
        {isPassed && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Language Mode */}
            <div className="rounded-[16px] bg-[#1a1a1a] p-4 border border-[rgba(255,255,255,0.06)] space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
                <Languages size={14} className="text-[#f5f5f5]" />
                <span>Interview Language</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {(["en", "hi", "hinglish"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-[600] transition-colors ${
                      selectedLanguage === lang
                        ? "bg-[#f5f5f5] text-[#0a0a0a]"
                        : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                    }`}
                  >
                    {lang === "en" ? "EN" : lang === "hi" ? "HI" : "Hinglish"}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Device Readiness */}
            <div className="rounded-[16px] bg-[#1a1a1a] p-4 border border-[rgba(255,255,255,0.06)] space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
                <Video size={14} className="text-[#f5f5f5]" />
                <span>AI Interviewer & Video Mirror</span>
              </div>
              <div className="flex items-center gap-3 pt-1 text-[13px] font-[500] text-[#f5f5f5]">
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>Bable AI Ready</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#8a8a8a]">
                  <span>Webcam & mic checked in pre-session lobby</span>
                </span>
              </div>
            </div>

            {/* 3. Estimated Duration */}
            <div className="rounded-[16px] bg-[#1a1a1a] p-4 border border-[rgba(255,255,255,0.06)] space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
                <Clock size={14} className="text-[#f5f5f5]" />
                <span>Duration & Format</span>
              </div>
              <p className="text-[13px] font-[600] text-[#f5f5f5] pt-1">
                ~15 minutes · 5 structured questions
              </p>
            </div>
          </div>
        )}

        {/* Personalized Questions Preview (if passed) */}
        {isPassed && verificationQuestions && verificationQuestions.length > 0 && (
          <div className="rounded-[16px] bg-[#1a1a1a]/60 border border-[rgba(255,255,255,0.06)] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[12px] font-[650] text-[#f5f5f5]">
              <Sparkles size={14} className="text-[#f5f5f5]" />
              <span>AI Question Planner: Tailored Topics for Your Session</span>
            </div>
            <ul className="space-y-1.5 text-[13px] text-[#8a8a8a] pl-5 list-disc">
              {verificationQuestions.slice(0, 3).map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Live AI Interview Room Modal */}
      {isInterviewOpen && isPassed && (
        <AiInterviewRoom
          userId={userId}
          jobId={jobId}
          candidateName={candidateName}
          targetJobTitle={targetJobTitle}
          jobPosting={jobPosting}
          verificationQuestions={verificationQuestions}
          preferredLanguage={selectedLanguage}
          analysis={analysis}
          onClose={() => setIsInterviewOpen(false)}
        />
      )}
    </>
  );
}
