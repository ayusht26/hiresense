import { useState } from "react";
import {
  Video,
  Languages,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AiInterviewRoom } from "@/components/interview/AiInterviewRoom";

interface InterviewLaunchCardProps {
  candidateName: string;
  targetJobTitle: string;
  jobPosting?: Record<string, any>;
  preferredLanguage?: "en" | "hi" | "code_mixed";
  verificationQuestions?: string[];
}

export function InterviewLaunchCard({
  candidateName,
  targetJobTitle,
  jobPosting = {},
  preferredLanguage = "en",
  verificationQuestions = [],
}: InterviewLaunchCardProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(preferredLanguage);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);

  return (
    <>
      <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.12)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[11px] font-[600] text-[#60a5fa] border border-[#3b82f6]/30">
                Next Step · AI Technical Assessment with Mira
              </span>
            </div>
            <h3 className="text-[22px] sm:text-[26px] font-[650] tracking-tight text-[#f5f5f5]">
              Ready to start your interview.
            </h3>
            <p className="mt-1 text-[14px] font-[450] text-[#8a8a8a]">
              Screening complete. You may proceed directly to the conversational AI interview for{" "}
              <span className="text-[#f5f5f5] font-[600]">{targetJobTitle}</span>.
            </p>
          </div>

          {/* Primary Start Interview Button */}
          <button
            type="button"
            onClick={() => setIsInterviewOpen(true)}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f5f5f5] px-8 text-[15px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98] shadow-lg self-start sm:self-center shrink-0"
          >
            <span>Start AI interview</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Interview Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Language Mode */}
          <div className="rounded-[16px] bg-[#1a1a1a] p-4 border border-[rgba(255,255,255,0.06)] space-y-2">
            <div className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
              <Languages size={14} className="text-[#f5f5f5]" />
              <span>Interview Language</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              {(["en", "hi", "code_mixed"] as const).map((lang) => (
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
                <span>Mira AI Ready</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={13} />
                <span>Webcam & Mic Check</span>
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

        {/* Personalized Questions Preview */}
        {verificationQuestions && verificationQuestions.length > 0 && (
          <div className="rounded-[16px] bg-[#1a1a1a]/60 border border-[rgba(255,255,255,0.06)] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[12px] font-[650] text-[#f5f5f5]">
              <Sparkles size={14} className="text-[#60a5fa]" />
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
      {isInterviewOpen && (
        <AiInterviewRoom
          candidateName={candidateName}
          targetJobTitle={targetJobTitle}
          jobPosting={jobPosting}
          verificationQuestions={verificationQuestions}
          preferredLanguage={selectedLanguage}
          onClose={() => setIsInterviewOpen(false)}
        />
      )}
    </>
  );
}
