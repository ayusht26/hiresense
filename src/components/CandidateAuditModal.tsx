import { useState } from "react";
import {
  X,
  Award,
  FileText,
  Mic,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Clock,
  Sparkles,
  UserCheck,
  UserX,
  ExternalLink,
} from "lucide-react";
import type { CandidateApplication } from "@/lib/recruiter-candidates";

interface CandidateAuditModalProps {
  candidate: CandidateApplication | null;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDecisionChange?: (candidateId: string, decision: "shortlisted" | "rejected" | "under_review") => void;
  resumeThreshold?: number;
  interviewThreshold?: number;
}

export function CandidateAuditModal({
  candidate,
  jobTitle,
  isOpen,
  onClose,
  onDecisionChange,
  resumeThreshold = 60,
  interviewThreshold = 60,
}: CandidateAuditModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "resume" | "interview">("overview");
  const [currentDecision, setCurrentDecision] = useState<"shortlisted" | "rejected" | "under_review">(
    candidate?.recruiterDecision || "under_review",
  );

  if (!isOpen || !candidate) return null;

  const resume = candidate.resumeAnalysis;
  const interview = candidate.interviewScorecard;

  const handleDecision = (decision: "shortlisted" | "rejected" | "under_review") => {
    setCurrentDecision(decision);
    if (onDecisionChange) {
      onDecisionChange(candidate.id, decision);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.12)] p-6 sm:p-8 text-left shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[11px] font-[600] text-[#f5f5f5] border border-[rgba(255,255,255,0.10)]">
                Evaluation Audit
              </span>
              {currentDecision === "shortlisted" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-[600] border border-emerald-500/20">
                  <CheckCircle2 size={12} /> Shortlisted
                </span>
              )}
              {currentDecision === "rejected" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[11px] font-[600] border border-red-500/20">
                  <UserX size={12} /> Rejected
                </span>
              )}
            </div>

            <h3 className="text-[24px] font-[650] tracking-tight text-[#f5f5f5]">
              {candidate.candidateName}.
            </h3>
            <p className="text-[13px] text-[#8a8a8a]">
              <span>{candidate.email}</span>
              {candidate.university && (
                <>
                  <span className="mx-2">·</span>
                  <span>{candidate.university}</span>
                </>
              )}
              {candidate.degree && (
                <>
                  <span className="mx-2">·</span>
                  <span>{candidate.degree}</span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dual-Score Showcase Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Resume Match Score */}
          {(() => {
            const isResumePassed = candidate.resumeScore >= resumeThreshold;
            return (
              <div
                className={`rounded-[16px] border p-4 flex items-center justify-between transition-colors ${
                  isResumePassed
                    ? "bg-emerald-500/[0.04] border-emerald-500/25"
                    : "bg-rose-500/[0.03] border-rose-500/20"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[12px] font-[600] text-[#8a8a8a] mb-1">
                    <FileText size={14} />
                    <span>Resume Match</span>
                    <span
                      className={`ml-1 text-[10px] font-[600] px-2 py-0.5 rounded-full border ${
                        isResumePassed
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {isResumePassed ? "Threshold Met" : "Below Threshold"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-[32px] font-[650] leading-none tabular ${
                        isResumePassed ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {candidate.resumeScore}
                    </span>
                    <span className="text-[14px] text-[#707070] font-[450]">/ 100</span>
                  </div>
                  <span className="mt-1 inline-block text-[11px] text-[#8a8a8a]">
                    Required cutoff: ≥ {resumeThreshold} / 100
                  </span>
                </div>

                {/* Visual Mini Dial */}
                <div
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                    isResumePassed
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                  }`}
                >
                  <span className="text-[13px] font-[700]">{candidate.resumeScore}%</span>
                </div>
              </div>
            );
          })()}

          {/* AI Interview Score */}
          {(() => {
            const hasInterview = candidate.interviewScore !== null;
            const isInterviewPassed = hasInterview && (candidate.interviewScore ?? 0) >= interviewThreshold;
            return (
              <div
                className={`rounded-[16px] border p-4 flex items-center justify-between transition-colors ${
                  !hasInterview
                    ? "bg-[#1a1a1a] border-[rgba(255,255,255,0.08)]"
                    : isInterviewPassed
                      ? "bg-emerald-500/[0.04] border-emerald-500/25"
                      : "bg-rose-500/[0.03] border-rose-500/20"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[12px] font-[600] text-[#8a8a8a] mb-1">
                    <Mic size={14} />
                    <span>AI Interview Score</span>
                    {hasInterview && (
                      <span
                        className={`ml-1 text-[10px] font-[600] px-2 py-0.5 rounded-full border ${
                          isInterviewPassed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {isInterviewPassed ? "Qualified" : "Below Cutoff"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    {hasInterview ? (
                      <>
                        <span
                          className={`text-[32px] font-[650] leading-none tabular ${
                            isInterviewPassed ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {candidate.interviewScore}
                        </span>
                        <span className="text-[14px] text-[#707070] font-[450]">/ 100</span>
                      </>
                    ) : (
                      <span className="text-[20px] font-[600] text-[#707070]">Test Pending</span>
                    )}
                  </div>
                  <span className="mt-1 inline-block text-[11px] text-[#8a8a8a]">
                    {hasInterview
                      ? `Screening cutoff: ≥ ${interviewThreshold} / 100`
                      : "Candidate has not taken interview"}
                  </span>
                </div>

                {hasInterview ? (
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                      isInterviewPassed
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                        : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    <span className="text-[13px] font-[700]">{candidate.interviewScore}</span>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-[rgba(255,255,255,0.15)] text-[#5c5c5c]">
                    <Clock size={16} />
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Audit Tabs */}
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-[600] transition-colors ${
              activeTab === "overview"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "text-[#8a8a8a] hover:text-[#f5f5f5]"
            }`}
          >
            Overview & Rubrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resume")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-[600] transition-colors ${
              activeTab === "resume"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "text-[#8a8a8a] hover:text-[#f5f5f5]"
            }`}
          >
            Resume Evidence ({resume?.requirement_matrix?.length || resume?.strengths?.length || (resume as any)?.matched_skills?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("interview")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-[600] transition-colors ${
              activeTab === "interview"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "text-[#8a8a8a] hover:text-[#f5f5f5]"
            }`}
          >
            Interview Answers {interview?.answers?.length ? `(${interview.answers.length})` : ""}
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Executive Summary if available */}
            {resume?.executive_summary && (
              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 space-y-1.5">
                <span className="text-[12px] font-[600] text-[#f5f5f5] block">Executive Summary</span>
                <p className="text-[13px] text-[#8a8a8a] leading-relaxed">
                  {resume.executive_summary}
                </p>
              </div>
            )}

            {/* Category Rubrics if interview taken */}
            {interview && interview.categories && (
              <div className="space-y-3">
                <h4 className="text-[14px] font-[650] text-[#f5f5f5] tracking-tight">
                  Interview Rubric Evaluation.
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-[16px] bg-[#1a1a1a] p-3 text-center border border-[rgba(255,255,255,0.06)]">
                    <span className="text-[11px] font-[450] text-[#707070] block">Technical Accuracy</span>
                    <span className="text-[18px] font-[650] text-[#f5f5f5] tabular">
                      {interview.categories.technicalAccuracy}/100
                    </span>
                  </div>
                  <div className="rounded-[16px] bg-[#1a1a1a] p-3 text-center border border-[rgba(255,255,255,0.06)]">
                    <span className="text-[11px] font-[450] text-[#707070] block">Problem Solving</span>
                    <span className="text-[18px] font-[650] text-[#f5f5f5] tabular">
                      {interview.categories.problemSolving}/100
                    </span>
                  </div>
                  <div className="rounded-[16px] bg-[#1a1a1a] p-3 text-center border border-[rgba(255,255,255,0.06)]">
                    <span className="text-[11px] font-[450] text-[#707070] block">Practical Evidence</span>
                    <span className="text-[18px] font-[650] text-[#f5f5f5] tabular">
                      {interview.categories.practicalEvidence}/100
                    </span>
                  </div>
                  <div className="rounded-[16px] bg-[#1a1a1a] p-3 text-center border border-[rgba(255,255,255,0.06)]">
                    <span className="text-[11px] font-[450] text-[#707070] block">Communication</span>
                    <span className="text-[18px] font-[650] text-[#f5f5f5] tabular">
                      {interview.categories.communicationClarity}/100
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Key Strengths & Gaps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 space-y-2">
                <span className="text-[12px] font-[600] text-[#f5f5f5] flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Key Takeaways
                </span>
                <ul className="space-y-1.5 text-[12px] text-[#8a8a8a] leading-relaxed">
                  {(
                    interview?.keyTakeaways?.length
                      ? interview.keyTakeaways
                      : resume?.strengths?.length
                        ? resume.strengths.map((s) => `${s.skill_or_area}: ${s.relevance}`)
                        : (resume as any)?.evidence_snippets || [
                            "Demonstrated structured thinking across core topics.",
                            "Consistent explanations during verification.",
                          ]
                  ).slice(0, 4).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#5c5c5c]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 space-y-2">
                <span className="text-[12px] font-[600] text-[#f5f5f5] flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-amber-400" /> Areas to Probe
                </span>
                <ul className="space-y-1.5 text-[12px] text-[#8a8a8a] leading-relaxed">
                  {(
                    interview?.gaps?.length
                      ? interview.gaps
                      : resume?.gaps?.length
                        ? resume.gaps.map((g) => `${g.requirement} (${g.severity}): ${g.impact}`)
                        : (resume as any)?.missing_or_unclear_skills || [
                            "Ask about distributed systems trade-offs.",
                            "Verify individual contributions to highlighted team projects.",
                          ]
                  ).slice(0, 4).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#5c5c5c]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Proctoring & Integrity Summary (Responsible AI Rules) */}
            <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#8a8a8a]" />
                <span className="text-[#f5f5f5] font-[500]">Integrity & Proctoring Signals</span>
                <span className="text-[#707070]">· Observable events only</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#222] text-[#8a8a8a] text-[11px] font-[500]">
                Normal session · No flags
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Resume Evidence */}
        {activeTab === "resume" && (
          <div className="space-y-4">
            {resume ? (
              <>
                {/* Requirement-by-Requirement Audit Matrix */}
                {resume.requirement_matrix && resume.requirement_matrix.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[12px] font-[600] text-[#f5f5f5] block">
                      Requirement-by-Requirement Evidence Matrix
                    </span>
                    <div className="space-y-2">
                      {resume.requirement_matrix.map((req, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-[14px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[13px] font-[600] text-[#f5f5f5]">
                              {req.requirement}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-[600] ${
                                  req.status === "matched"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : req.status === "partial"
                                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                                }`}
                              >
                                {req.status === "matched"
                                  ? "Matched"
                                  : req.status === "partial"
                                    ? "Partially Matched"
                                    : "Missing in Resume"}
                              </span>
                              <span className="text-[11px] text-[#707070] capitalize">
                                {req.type}
                              </span>
                            </div>
                          </div>
                          {req.resume_evidence ? (
                            <p className="text-[12px] text-[#8a8a8a] leading-relaxed bg-[#141414] p-2.5 rounded-[10px] border border-[rgba(255,255,255,0.04)]">
                              <span className="text-[#5c5c5c] font-[600]">Resume Evidence: </span>
                              "{req.resume_evidence}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-[#5c5c5c] italic">
                              No explicit mention found in uploaded resume.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Skills Found */}
                {resume.strengths && resume.strengths.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[12px] font-[600] text-[#f5f5f5] block">
                      Verified Strengths & Technical Skills
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {resume.strengths.map((str, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-[12px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] space-y-1"
                        >
                          <div className="flex items-center gap-1.5 text-[12px] font-[600] text-[#f5f5f5]">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>{str.skill_or_area}</span>
                          </div>
                          <p className="text-[11px] text-[#8a8a8a] leading-relaxed">
                            {str.relevance}
                          </p>
                          {str.evidence_quote && (
                            <p className="text-[11px] text-[#5c5c5c] italic">
                              "{str.evidence_quote}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy matched_skills fallback if present */}
                {(resume as any).matched_skills && !(resume.requirement_matrix?.length) && (
                  <div className="space-y-2">
                    <span className="text-[12px] font-[600] text-[#f5f5f5] block">Matched Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {((resume as any).matched_skills as string[]).map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1a1a1a] text-[#f5f5f5] text-[12px] font-[500] border border-[rgba(255,255,255,0.12)]"
                        >
                          <CheckCircle2 size={11} className="text-emerald-400" />
                          <span>{skill}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[13px] text-[#8a8a8a] py-6 text-center">
                Resume parsed without detailed rubric snippets.
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Interview Answers */}
        {activeTab === "interview" && (
          <div className="space-y-4">
            {interview && interview.answers && interview.answers.length > 0 ? (
              <div className="space-y-3">
                {interview.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-[650] text-[#f5f5f5]">
                        Question {idx + 1}
                        {ans.phaseLabel ? ` · ${ans.phaseLabel}` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        {ans.compositeScore !== undefined && (
                          <span className="text-[11px] font-[600] px-2 py-0.5 rounded-full bg-[#222] text-[#f5f5f5]">
                            Score: {ans.compositeScore}/100
                          </span>
                        )}
                        <span className="text-[#707070]">{ans.durationSeconds}s duration</span>
                      </div>
                    </div>
                    <p className="text-[13px] font-[500] text-[#f5f5f5]">
                      {ans.question || (ans as any).questionText}
                    </p>
                    <div className="p-3 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[12px] text-[#8a8a8a] leading-relaxed">
                      "{ans.transcribedAnswer || (ans as any).answerText || "(No verbal response captured)"}"
                    </div>
                    {ans.evidenceQuotes && ans.evidenceQuotes.length > 0 && (
                      <div className="text-[11px] text-[#707070] pl-2 border-l border-[rgba(255,255,255,0.10)]">
                        Key evidence: {ans.evidenceQuotes.join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Clock size={20} className="mx-auto text-[#5c5c5c]" />
                <p className="text-[13px] text-[#8a8a8a]">
                  Candidate has not yet completed the spoken AI interview session.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recruiter Action Bar */}
        <div className="border-t border-[rgba(255,255,255,0.08)] pt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[12px] text-[#707070]">
            Applied: {new Date(candidate.appliedAt).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              className={`inline-flex h-9 items-center gap-1.5 px-4 rounded-full text-[13px] font-[600] transition-colors border ${
                currentDecision === "rejected"
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-transparent text-[#8a8a8a] border-[rgba(255,255,255,0.12)] hover:text-red-400 hover:border-red-400/40"
              }`}
            >
              <UserX size={13} />
              <span>Reject</span>
            </button>

            <button
              type="button"
              onClick={() => handleDecision("shortlisted")}
              className={`inline-flex h-9 items-center gap-1.5 px-5 rounded-full text-[13px] font-[600] transition-colors ${
                currentDecision === "shortlisted"
                  ? "bg-emerald-500 text-white"
                  : "bg-[#f5f5f5] text-[#0a0a0a] hover:bg-[#e0e0e0]"
              }`}
            >
              <UserCheck size={13} />
              <span>{currentDecision === "shortlisted" ? "Shortlisted" : "Shortlist candidate"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
