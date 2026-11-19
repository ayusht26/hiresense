import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  Mic,
  Award,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Inbox,
  UserCheck,
  UserX,
  Sliders,
} from "lucide-react";
import {
  type CandidateApplication,
  updateCandidateApplicationStatus,
} from "@/lib/recruiter-candidates";
import { CandidateAuditModal } from "./CandidateAuditModal";

interface JobCandidatesViewProps {
  candidates: CandidateApplication[];
  jobTitle: string;
  loading?: boolean;
  resumeThreshold?: number;
  interviewThreshold?: number;
}

export function JobCandidatesView({
  candidates,
  jobTitle,
  loading = false,
  resumeThreshold = 60,
  interviewThreshold = 60,
}: JobCandidatesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<
    "all" | "selected" | "below" | "completed" | "pending"
  >("all");
  const [sortBy, setSortBy] = useState<"interview" | "resume" | "recent">("interview");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Recruiter interactive threshold slider (initialized to the job's interview screening threshold)
  const [activeThreshold, setActiveThreshold] = useState<number>(interviewThreshold);

  // Local decision state for overrides
  const [decisions, setDecisions] = useState<
    Record<string, "shortlisted" | "rejected" | "under_review">
  >({});

  const handleDecisionChange = async (
    candidateId: string,
    decision: "shortlisted" | "rejected" | "under_review",
  ) => {
    setDecisions((prev) => ({ ...prev, [candidateId]: decision }));
    // Persist to Supabase if it's a real database application
    if (decision === "shortlisted" || decision === "rejected") {
      await updateCandidateApplicationStatus(candidateId, decision);
    }
  };

  // Helper to determine if candidate is selected / above threshold vs not selected / below threshold
  const getCandidateClassification = (candidate: CandidateApplication) => {
    const decision = decisions[candidate.id] || candidate.recruiterDecision || "under_review";
    const isTested = candidate.interviewScore !== null;

    // Recruiter manual overrides take precedence
    if (decision === "shortlisted") {
      return {
        isSelected: true,
        reason: "Shortlisted",
        badge: "Shortlisted (Override)",
        isOverride: true,
      };
    }
    if (decision === "rejected") {
      return {
        isSelected: false,
        reason: "Rejected",
        badge: "Rejected (Override)",
        isOverride: true,
      };
    }

    // Automated threshold checks:
    if (isTested) {
      const score = candidate.interviewScore ?? 0;
      const isPassed = score >= activeThreshold;
      return {
        isSelected: isPassed,
        reason: isPassed ? `Qualified (≥ ${activeThreshold})` : `Below threshold (< ${activeThreshold})`,
        badge: isPassed ? "Qualified" : "Below threshold",
        isOverride: false,
      };
    } else {
      // Pending interview: evaluated on resume match threshold
      const isResumePassed = candidate.resumeScore >= resumeThreshold;
      return {
        isSelected: isResumePassed,
        reason: isResumePassed ? `Resume passed (≥ ${resumeThreshold})` : `Resume below threshold (< ${resumeThreshold})`,
        badge: isResumePassed ? "Eligible for Interview" : "Resume Below Threshold",
        isOverride: false,
      };
    }
  };

  // Metrics calculated strictly from real candidates
  const completedCount = useMemo(
    () => candidates.filter((c) => c.interviewScore !== null).length,
    [candidates],
  );

  const selectedCount = useMemo(
    () => candidates.filter((c) => getCandidateClassification(c).isSelected).length,
    [candidates, activeThreshold, decisions, resumeThreshold],
  );

  const belowCount = useMemo(
    () => candidates.length - selectedCount,
    [candidates.length, selectedCount],
  );

  const avgResumeScore = useMemo(() => {
    if (candidates.length === 0) return 0;
    const sum = candidates.reduce((acc, c) => acc + (c.resumeScore || 0), 0);
    return Math.round(sum / candidates.length);
  }, [candidates]);

  const avgInterviewScore = useMemo(() => {
    const withInterview = candidates.filter((c) => c.interviewScore !== null);
    if (withInterview.length === 0) return 0;
    const sum = withInterview.reduce((acc, c) => acc + (c.interviewScore || 0), 0);
    return Math.round(sum / withInterview.length);
  }, [candidates]);

  // Filter & Sort
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        // Search
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.candidateName.toLowerCase().includes(q);
        const matchesEmail = c.email.toLowerCase().includes(q);
        const matchesCollege = (c.university || "").toLowerCase().includes(q);
        if (q && !matchesName && !matchesEmail && !matchesCollege) return false;

        // Classification status
        const { isSelected } = getCandidateClassification(c);

        // Filter tabs
        if (filterTab === "selected" && !isSelected) return false;
        if (filterTab === "below" && isSelected) return false;
        if (filterTab === "completed" && c.interviewScore === null) return false;
        if (filterTab === "pending" && c.interviewScore !== null) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "interview") {
          return (b.interviewScore ?? -1) - (a.interviewScore ?? -1);
        }
        if (sortBy === "resume") {
          return b.resumeScore - a.resumeScore;
        }
        return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      });
  }, [candidates, searchQuery, filterTab, sortBy, activeThreshold, decisions, resumeThreshold]);

  const openAudit = (candidate: CandidateApplication) => {
    setSelectedCandidate({
      ...candidate,
      recruiterDecision: decisions[candidate.id] || candidate.recruiterDecision || "under_review",
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-[#8a8a8a]">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.2)] border-t-[#f5f5f5]" />
        <p className="mt-3 text-[14px] font-[450]">Loading verified candidate applications...</p>
      </div>
    );
  }

  // True zero state: No real candidates have applied yet
  if (candidates.length === 0) {
    return (
      <div className="rounded-[24px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] p-12 text-center space-y-4 max-w-lg mx-auto my-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[30%] bg-[#222] text-[#8a8a8a]">
          <Inbox size={26} />
        </div>
        <div>
          <h3 className="text-[20px] font-[650] text-[#f5f5f5] tracking-tight">
            No applicants yet.
          </h3>
          <p className="mt-2 text-[13px] text-[#8a8a8a] leading-relaxed">
            No registered job seekers have applied or submitted test evaluations for this position yet.
          </p>
          <p className="mt-1 text-[12px] text-[#5c5c5c] leading-relaxed">
            As soon as candidates apply and complete their AI interviews, their profiles, resume match scores, and interview scorecards will appear here in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
          <span className="text-[11px] font-[450] text-[#707070] block">Real applicants</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[20px] font-[650] text-[#f5f5f5] tabular">
              {candidates.length}
            </span>
            <span className="text-[11px] text-[#8a8a8a]">registered</span>
          </div>
        </div>

        <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
          <span className="text-[11px] font-[450] text-[#707070] block">Interviewed</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[20px] font-[650] text-[#f5f5f5] tabular">
              {completedCount}
            </span>
            <span className="text-[11px] text-[#8a8a8a]">tested</span>
          </div>
        </div>

        <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
          <span className="text-[11px] font-[450] text-[#707070] block">Avg resume fit</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[20px] font-[650] text-[#f5f5f5] tabular">
              {avgResumeScore}%
            </span>
          </div>
        </div>

        <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
          <span className="text-[11px] font-[450] text-[#707070] block">Avg interview score</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[20px] font-[650] text-[#f5f5f5] tabular">
              {avgInterviewScore > 0 ? `${avgInterviewScore}/100` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Recruiter Screening Threshold Bar (derived from landing page visual language) */}
      <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders size={15} className="text-emerald-400" />
            <span className="text-[14px] font-[650] text-[#f5f5f5]">Screening Threshold Cutoff</span>
            <span className="text-[11px] font-[600] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {selectedCount} Qualified
            </span>
            {belowCount > 0 && (
              <span className="text-[11px] font-[600] text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                {belowCount} Below Cutoff
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#8a8a8a]">Threshold:</span>
            <span className="font-mono text-[14px] font-[700] text-[#f5f5f5] tabular px-2.5 py-0.5 rounded-full bg-[#1f1f1f] border border-[rgba(255,255,255,0.12)]">
              {activeThreshold} / 100
            </span>
          </div>
        </div>

        {/* Minimal Threshold Bar with interactive slider */}
        <div className="space-y-1.5 pt-1">
          <div className="relative h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500/40 to-emerald-400 rounded-full transition-all duration-150"
              style={{ width: `${activeThreshold}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={activeThreshold}
            onChange={(e) => setActiveThreshold(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#262626] rounded-lg appearance-none"
            aria-label="Screening threshold slider"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#707070] pt-0.5">
          <span>0 (Pass all)</span>
          <span className="text-[#8a8a8a]">
            Role criteria: Resume ≥ {resumeThreshold} · Interview ≥ {interviewThreshold}
          </span>
          <span>100 (Strict)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707070]" />
          <input
            type="text"
            placeholder="Search applicants by name, email, or university..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-[12px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-[#f5f5f5]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`h-8 px-3 rounded-full text-[11px] font-[600] transition-colors ${
              filterTab === "all"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)] hover:text-[#f5f5f5]"
            }`}
          >
            All ({candidates.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("selected")}
            className={`h-8 px-3 rounded-full text-[11px] font-[600] inline-flex items-center gap-1.5 transition-colors ${
              filterTab === "selected"
                ? "bg-emerald-400 text-[#0a0a0a]"
                : "bg-[#1a1a1a] text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Qualified ({selectedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("below")}
            className={`h-8 px-3 rounded-full text-[11px] font-[600] inline-flex items-center gap-1.5 transition-colors ${
              filterTab === "below"
                ? "bg-rose-400 text-[#0a0a0a]"
                : "bg-[#1a1a1a] text-rose-400 border border-rose-500/20 hover:bg-rose-500/10"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span>Below cutoff ({belowCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("completed")}
            className={`h-8 px-3 rounded-full text-[11px] font-[600] transition-colors ${
              filterTab === "completed"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)] hover:text-[#f5f5f5]"
            }`}
          >
            Tested ({completedCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("pending")}
            className={`h-8 px-3 rounded-full text-[11px] font-[600] transition-colors ${
              filterTab === "pending"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)] hover:text-[#f5f5f5]"
            }`}
          >
            Pending ({candidates.length - completedCount})
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 ml-1 text-[11px] text-[#707070]">
            <ArrowUpDown size={12} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "interview" | "resume" | "recent")}
              className="bg-[#1a1a1a] text-[#f5f5f5] rounded-full border border-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[11px] font-[500] focus:outline-none"
            >
              <option value="interview">Interview score</option>
              <option value="resume">Resume fit</option>
              <option value="recent">Most recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidate Cards List */}
      {filteredCandidates.length === 0 ? (
        <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-8 text-center text-[#8a8a8a]">
          <p className="text-[13px]">No candidates match your search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCandidates.map((candidate, idx) => {
            const { isSelected, reason, badge, isOverride } = getCandidateClassification(candidate);
            const initials =
              candidate.candidateName
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "C";

            // Check if we crossed the threshold divider boundary when sorted by interview score
            const prevCandidate = idx > 0 ? filteredCandidates[idx - 1] : null;
            const prevPassed = prevCandidate
              ? getCandidateClassification(prevCandidate).isSelected
              : null;
            const showBelowDivider =
              sortBy === "interview" &&
              (filterTab === "all" || filterTab === "completed") &&
              prevPassed === true &&
              isSelected === false;

            return (
              <div key={candidate.id} className="space-y-3">
                {/* Visual "Below threshold" divider line from landing page spec */}
                {showBelowDivider && (
                  <div className="flex items-center gap-3 py-2 text-[12px] text-muted-foreground list-none">
                    <span className="h-px flex-1 bg-[rgba(255,255,255,0.12)]" />
                    <span className="text-[11px] font-[600] text-rose-400 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Below threshold ({activeThreshold})
                    </span>
                    <span className="h-px flex-1 bg-[rgba(255,255,255,0.12)]" />
                  </div>
                )}

                <div
                  onClick={() => openAudit(candidate)}
                  className="group relative cursor-pointer rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 sm:p-5 hover:border-[rgba(255,255,255,0.18)] hover:bg-[#181818] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Candidate Info */}
                    <div className="flex items-start gap-3">
                      {/* Neutral initials tile */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[30%] bg-[#262626] border border-[rgba(255,255,255,0.10)] text-[14px] font-[700] text-[#f5f5f5]">
                        {initials}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Minimal status dot */}
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full transition-all ${
                              isSelected
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                : "bg-rose-400/90 shadow-[0_0_8px_rgba(251,113,133,0.4)]"
                            }`}
                          />

                          <span className="text-[15px] font-[650] text-[#f5f5f5] group-hover:text-white">
                            {candidate.candidateName}
                          </span>

                          {isOverride && (
                            <span className="text-[10px] font-[600] px-2 py-0.5 rounded-full bg-[#262626] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)]">
                              {badge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[12px] text-[#8a8a8a] flex-wrap">
                          {candidate.email && <span>{candidate.email}</span>}
                          {candidate.university && (
                            <>
                              <span className="text-[#5c5c5c]">•</span>
                              <span>{candidate.university}</span>
                            </>
                          )}
                          {candidate.degree && (
                            <>
                              <span className="text-[#5c5c5c]">•</span>
                              <span>{candidate.degree}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#707070] pt-0.5">
                          <Clock size={11} />
                          <span>Applied {new Date(candidate.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Scores & Action */}
                    <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center shrink-0">
                      {/* Resume Match Score */}
                      <div className="text-right">
                        <span className="text-[10px] font-[500] uppercase tracking-wider text-[#707070] block">
                          Resume fit
                        </span>
                        <div className="flex items-baseline justify-end gap-1">
                          <span
                            className={`text-[18px] font-[650] tabular ${
                              candidate.resumeScore >= resumeThreshold
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {candidate.resumeScore}
                          </span>
                          <span className="text-[11px] text-[#707070]">/ 100</span>
                        </div>
                      </div>

                      {/* AI Interview Score */}
                      <div className="text-right">
                        <span className="text-[10px] font-[500] uppercase tracking-wider text-[#707070] block">
                          AI Interview
                        </span>
                        <div className="flex items-baseline justify-end gap-1">
                          {candidate.interviewScore !== null ? (
                            <>
                              <span
                                className={`text-[18px] font-[700] tabular ${
                                  candidate.interviewScore >= activeThreshold
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {candidate.interviewScore}
                              </span>
                              <span className="text-[11px] text-[#707070]">/ 100</span>
                            </>
                          ) : (
                            <span className="text-[12px] font-[500] text-[#707070]">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CTA Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAudit(candidate);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-[600] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] text-[#f5f5f5] hover:bg-[#262626] hover:border-[rgba(255,255,255,0.16)] transition-colors"
                      >
                        <span>Audit</span>
                        <ChevronRight size={13} className="text-[#8a8a8a]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom Footer Notice */}
          <div className="rounded-[16px] bg-[#141414] border border-[rgba(255,255,255,0.06)] px-4 py-2.5 flex items-center justify-between text-[11px] text-[#707070] flex-wrap gap-2 mt-2">
            <span>Override recorded by recruiter · reason required</span>
            <span className="tabular">
              Showing {filteredCandidates.length} applicants · Role Gates: Resume ≥ {resumeThreshold} · Interview ≥ {activeThreshold}
            </span>
          </div>
        </div>
      )}

      {/* Candidate Audit Modal */}
      <CandidateAuditModal
        candidate={selectedCandidate}
        jobTitle={jobTitle}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDecisionChange={handleDecisionChange}
        resumeThreshold={resumeThreshold}
        interviewThreshold={activeThreshold}
      />
    </div>
  );
}
