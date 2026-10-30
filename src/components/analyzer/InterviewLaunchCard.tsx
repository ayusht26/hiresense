import { useState } from "react";
import {
  Video,
  Mic,
  Languages,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";

interface InterviewLaunchCardProps {
  candidateName: string;
  targetJobTitle: string;
  preferredLanguage: "en" | "hi" | "code_mixed";
  verificationQuestions: string[];
}

export function InterviewLaunchCard({
  candidateName,
  targetJobTitle,
  preferredLanguage,
  verificationQuestions,
}: InterviewLaunchCardProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(preferredLanguage);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case "hi":
        return "Hindi (हिन्दी)";
      case "code_mixed":
        return "Hinglish (Code-mixed)";
      default:
        return "English";
    }
  };

  return (
    <>
      <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.12)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[11px] font-[600] text-[#60a5fa] border border-[#3b82f6]/30">
                Next Step · AI Technical Assessment
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
            onClick={() => setIsModalOpen(true)}
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
              <span>Proctoring & Device Readiness</span>
            </div>
            <div className="flex items-center gap-3 pt-1 text-[13px] font-[500] text-[#f5f5f5]">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={13} />
                <span>Microphone ready</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={13} />
                <span>Camera ready</span>
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
              ~15–20 minutes · 5 structured questions
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

      {/* Confirmation Modal when user clicks "Start AI Interview" */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.15)] p-7 space-y-5 text-left shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-[#f5f5f5] border border-[rgba(255,255,255,0.12)]">
                  <Video size={16} />
                </div>
                <div>
                  <h4 className="text-[16px] font-[650] text-[#f5f5f5]">
                    AI Interview Initialized.
                  </h4>
                  <span className="text-[12px] text-[#8a8a8a]">
                    Language: {getLanguageLabel(selectedLanguage)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#8a8a8a] hover:text-[#f5f5f5]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-[14px] font-[450] text-[#8a8a8a] leading-relaxed">
              <p>
                Candidate <strong className="text-[#f5f5f5]">{candidateName}</strong> is registered
                and verified for the technical interview session for{" "}
                <strong className="text-[#f5f5f5]">{targetJobTitle}</strong>.
              </p>
              <div className="rounded-[16px] bg-[#1a1a1a] p-3.5 border border-[rgba(255,255,255,0.06)] space-y-1.5 text-[13px]">
                <div className="flex items-center gap-2 text-emerald-400 font-[600]">
                  <CheckCircle2 size={14} />
                  <span>Session Pipeline Ready</span>
                </div>
                <p className="text-[#707070] text-[12px]">
                  Audio transcription, speech synthesis, and proctoring state machines have been
                  prepared for this application.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-6 rounded-full bg-[#f5f5f5] text-[#0a0a0a] text-[13px] font-[600] hover:bg-[#e0e0e0] transition-colors"
              >
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
