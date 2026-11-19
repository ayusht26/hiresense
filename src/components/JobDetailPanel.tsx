import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Share2,
  Edit3,
  Users,
  ChevronRight,
} from "lucide-react";
import type { Job, StructuredJobListing } from "@/types/database.types";
import { TechLogoTile } from "./TechLogoTile";
import { CompanyLogo } from "./CompanyLogo";
import {
  type ApplicationRecord,
  getApplicationCtaLabel,
  getApplicationProgressTracker,
} from "@/lib/applications";
import {
  getCandidatesForJob,
  type CandidateApplication,
} from "@/lib/recruiter-candidates";
import { JobCandidatesView } from "./JobCandidatesView";

interface JobDetailPanelProps {
  job: Job;
  isRecruiter?: boolean;
  application?: ApplicationRecord | null;
  isBookmarked?: boolean;
  onToggleBookmark?: (jobId: string) => void;
  onEdit?: (job: Job) => void;
  onToggleStatus?: (job: Job) => void;
  onDelete?: (job: Job) => void;
}

export function JobDetailPanel({
  job,
  isRecruiter = false,
  application = null,
  isBookmarked: externalBookmarked,
  onToggleBookmark,
  onEdit,
  onToggleStatus,
  onDelete,
}: JobDetailPanelProps) {
  const [internalBookmarked, setInternalBookmarked] = useState(false);
  const isBookmarked = externalBookmarked !== undefined ? externalBookmarked : internalBookmarked;

  const [copied, setCopied] = useState(false);
  const [recruiterView, setRecruiterView] = useState<"details" | "candidates">("candidates");
  const [candidates, setCandidates] = useState<CandidateApplication[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Load candidate test-takers whenever job changes or candidates tab opened
  useEffect(() => {
    if (isRecruiter && job?.id) {
      let active = true;
      setLoadingCandidates(true);
      getCandidatesForJob(job.id, job.title).then((results) => {
        if (active) {
          setCandidates(results);
          setLoadingCandidates(false);
        }
      });
      return () => {
        active = false;
      };
    }
  }, [job?.id, job?.title, isRecruiter, recruiterView]);

  // Parse structured data safely
  const structured = (job.generated_posting || {}) as Partial<StructuredJobListing>;

  const salaryDisplay = job.salary_display || structured.salary?.display || "Not specified";
  const location = job.location || structured.location || "Not specified";
  const workMode = job.work_mode || structured.work_mode || "Not specified";
  const employmentType = job.job_type || structured.employment_type || "Full-time";
  const experience = job.experience || structured.experience || "Not specified";

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBookmarkClick = () => {
    if (onToggleBookmark) {
      onToggleBookmark(job.id);
    } else {
      setInternalBookmarked(!internalBookmarked);
    }
  };

  const isDraft = job.status === "draft";
  const ctaLabel = getApplicationCtaLabel(application);
  const tracker = getApplicationProgressTracker(application);

  return (
    <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 text-left space-y-6 overflow-y-auto">
      {/* Top Header & Core Info */}
      <div className="space-y-4 border-b border-[rgba(255,255,255,0.08)] pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-[#f5f5f5] border border-[rgba(255,255,255,0.10)]">
              <CompanyLogo name={job.company_name} size="xs" />
              <span>{job.company_name}</span>
            </span>

            {workMode !== "Not specified" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1f1f1f] text-[12px] font-[450] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)] capitalize">
                {workMode}
              </span>
            )}

            {isRecruiter && (
              <span
                className={`inline-flex items-center px-3 py-0.5 rounded-full text-[12px] font-[600] border ${
                  isDraft
                    ? "bg-[#262626] text-[#8a8a8a] border-[rgba(255,255,255,0.12)]"
                    : "bg-[#1f2937] text-[#60a5fa] border-[#3b82f6]/40"
                }`}
              >
                {isDraft ? "Draft" : "Published"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#262626] transition-colors"
              title="Share job link"
            >
              <Share2 size={15} />
            </button>
            <button
              type="button"
              onClick={handleBookmarkClick}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#262626] transition-colors"
              title={isBookmarked ? "Saved" : "Save job"}
            >
              <Bookmark size={15} className={isBookmarked ? "fill-[#f5f5f5] text-[#f5f5f5]" : ""} />
            </button>
          </div>
        </div>

        {/* Job Title with terminal period */}
        <h2 className="text-[28px] sm:text-[32px] font-[650] leading-[1.1] tracking-tight text-[#f5f5f5]">
          {job.title}.
        </h2>

        {/* Company • Location • Salary summary line */}
        <div className="flex items-center gap-2 text-[15px] font-[450] text-[#9a9a9a] flex-wrap">
          <span className="font-[600] text-[#f5f5f5]">{job.company_name}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} className="text-[#8a8a8a]" />
            <span>{location}</span>
          </span>
          <span>•</span>
          <span className="font-[600] text-[#f5f5f5]">{salaryDisplay}</span>
        </div>

        {/* Screening Thresholds Badges */}
        <div className="flex items-center gap-2 text-[12px] text-[#8a8a8a] flex-wrap pt-0.5">
          <span className="font-[600] text-[#f5f5f5]">Screening Gates:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-emerald-400 border border-emerald-500/20 font-[500]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Resume ≥ {job.resume_threshold ?? 60} / 100</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-emerald-400 border border-emerald-500/20 font-[500]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Interview ≥ {job.interview_threshold ?? 60} / 100</span>
          </span>
        </div>

        {/* Student Progress Tracker & Context-Aware CTA */}
        {!isRecruiter && (
          <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] p-4 space-y-2.5">
            {/* Step Dots: Applied · Resume · Interview · Results */}
            <div className="flex items-center gap-2 text-[12px] font-[600] flex-wrap">
              {tracker.steps.map((step, idx) => (
                <div key={step.label} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-[#5c5c5c] mx-1">·</span>}
                  {step.state === "done" ? (
                    <span
                      aria-label="Completed"
                      className="inline-block h-2 w-2 rounded-full bg-[#f5f5f5] shrink-0"
                    />
                  ) : step.state === "current" ? (
                    <span
                      aria-label="In progress"
                      className="relative inline-flex h-2.5 w-2.5 rounded-full border border-[#f5f5f5] shrink-0 overflow-hidden"
                    >
                      <span className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#f5f5f5]" />
                    </span>
                  ) : (
                    <span
                      aria-label="Upcoming"
                      className="inline-block h-2 w-2 rounded-full border border-[#5c5c5c] bg-transparent shrink-0"
                    />
                  )}
                  <span className={step.state === "upcoming" ? "text-[#5c5c5c]" : "text-[#f5f5f5]"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Next Action Text */}
            <p className="text-[12px] text-[#8a8a8a] leading-relaxed">{tracker.nextActionText}</p>
          </div>
        )}

        {/* Primary CTA Row */}
        <div className="pt-2 flex items-center gap-3 flex-wrap">
          {!isRecruiter ? (
            <Link
              to="/jobs/$jobId/apply"
              params={{ jobId: job.id }}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#f5f5f5] px-8 text-[15px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98]"
            >
              {ctaLabel}
            </Link>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Recruiter View Toggle Button */}
              <button
                type="button"
                onClick={() => setRecruiterView(recruiterView === "candidates" ? "details" : "candidates")}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-[14px] font-[600] transition-all active:scale-[0.98] ${
                  recruiterView === "candidates"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#1a1a1a] border border-[rgba(255,255,255,0.14)] text-[#f5f5f5] hover:bg-[#262626]"
                }`}
              >
                <Users size={15} />
                <span>Candidates & Scores ({candidates.length})</span>
              </button>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(job)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] px-4 text-[14px] font-[600] text-[#f5f5f5] transition-all hover:bg-[#262626] active:scale-[0.98]"
                >
                  <Edit3 size={14} />
                  <span>Edit listing</span>
                </button>
              )}

              {onToggleStatus && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(job)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] px-4 text-[14px] font-[600] text-[#f5f5f5] transition-all hover:bg-[#262626]"
                >
                  {isDraft ? "Publish listing" : "Unpublish to draft"}
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(job)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-transparent px-3 text-[13px] font-[450] text-[#707070] transition-colors hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {copied && <span className="text-[13px] text-[#8a8a8a]">Link copied to clipboard!</span>}
        </div>
      </div>

      {/* Recruiter Section Switcher Tabs */}
      {isRecruiter && (
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
          <button
            type="button"
            onClick={() => setRecruiterView("details")}
            className={`h-9 px-4 rounded-full text-[13px] font-[600] transition-colors ${
              recruiterView === "details"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "text-[#8a8a8a] hover:text-[#f5f5f5]"
            }`}
          >
            Listing details
          </button>
          <button
            type="button"
            onClick={() => setRecruiterView("candidates")}
            className={`h-9 px-4 rounded-full text-[13px] font-[600] inline-flex items-center gap-2 transition-colors ${
              recruiterView === "candidates"
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "text-[#8a8a8a] hover:text-[#f5f5f5]"
            }`}
          >
            <Users size={14} />
            <span>Candidates & Test Scores</span>
            <span className="tabular text-[11px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.12)] font-[600]">
              {candidates.length}
            </span>
          </button>
        </div>
      )}

      {/* RENDER CANDIDATES VIEW */}
      {isRecruiter && recruiterView === "candidates" ? (
        <JobCandidatesView
          candidates={candidates}
          jobTitle={job.title}
          loading={loadingCandidates}
          resumeThreshold={job.resume_threshold ?? 60}
          interviewThreshold={job.interview_threshold ?? 60}
        />
      ) : (
        /* RENDER JOB DETAILS VIEW */
        <div className="space-y-8">
          {/* Recruiter Quick Candidate Highlight Banner */}
          {isRecruiter && candidates.length > 0 && (
            <div
              onClick={() => setRecruiterView("candidates")}
              className="group cursor-pointer rounded-[20px] bg-[#1a1a1a] border border-[#f5f5f5]/30 p-4 transition-all hover:bg-[#222] flex items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[#0a0a0a] font-[650] text-[15px]">
                  {candidates.length}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-[650] text-[#f5f5f5]">
                      {candidates.length} Registered Candidate{candidates.length > 1 ? "s" : ""} Evaluated
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0066ff]/20 text-[#0066ff] text-[11px] font-[600]">
                      Real Assessment Data
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8a8a8a] mt-0.5">
                    {candidates
                      .slice(0, 2)
                      .map(
                        (c) =>
                          `${c.candidateName} (Resume: ${c.resumeScore}%, Interview: ${
                            c.interviewScore !== null ? `${c.interviewScore}/100` : "Pending"
                          })`,
                      )
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f5f5f5] text-[#0a0a0a] text-[12px] font-[600] group-hover:bg-[#e0e0e0] transition-colors shrink-0">
                <span>View Evaluation</span>
                <ChevronRight size={14} />
              </span>
            </div>
          )}

          {/* Section 1: Job Details Matrix */}
          <div className="space-y-3">
            <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">Job details.</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
                <span className="text-[12px] font-[450] text-[#707070] block">Employment type</span>
                <span className="text-[14px] font-[600] text-[#f5f5f5] capitalize">
                  {employmentType}
                </span>
              </div>

              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
                <span className="text-[12px] font-[450] text-[#707070] block">Experience</span>
                <span className="text-[14px] font-[600] text-[#f5f5f5]">{experience}</span>
              </div>

              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
                <span className="text-[12px] font-[450] text-[#707070] block">Location</span>
                <span className="text-[14px] font-[600] text-[#f5f5f5]">{location}</span>
              </div>

              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
                <span className="text-[12px] font-[450] text-[#707070] block">Work mode</span>
                <span className="text-[14px] font-[600] text-[#f5f5f5] capitalize">{workMode}</span>
              </div>
            </div>

            {/* Screening Gates Card */}
            <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-[650] text-[#f5f5f5] tracking-tight">Screening Gates.</h4>
                <span className="text-[11px] text-[#707070]">Configured workflow thresholds</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.06)] space-y-1">
                  <span className="text-[11px] font-[500] text-[#8a8a8a] block">Resume Match Threshold</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-[650] text-[#f5f5f5] tabular">{job.resume_threshold ?? 60}</span>
                    <span className="text-[12px] text-[#707070]">/ 100</span>
                  </div>
                  <p className="text-[11px] text-[#5c5c5c]">Candidates must pass this to unlock the AI interview.</p>
                </div>
                <div className="p-3 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.06)] space-y-1">
                  <span className="text-[11px] font-[500] text-[#8a8a8a] block">Interview Screening Threshold</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-[650] text-[#f5f5f5] tabular">{job.interview_threshold ?? 60}</span>
                    <span className="text-[12px] text-[#707070]">/ 100</span>
                  </div>
                  <p className="text-[11px] text-[#5c5c5c]">Benchmark score out of 100 for candidate selection.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: About the role */}
          {structured.about_role && (
            <div className="space-y-2.5">
              <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">About the role.</h4>
              <p className="text-[14px] leading-relaxed text-[#8a8a8a]">{structured.about_role}</p>
            </div>
          )}

          {/* Section 3: Tech Stack & Devicon Tiles */}
          {structured.tech_stack && structured.tech_stack.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">Tech stack.</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {structured.tech_stack.map((item, idx) => (
                  <TechLogoTile key={idx} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Mandatory & Preferred Qualifications */}
          {structured.qualifications && (
            <div className="space-y-4">
              <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">Qualifications.</h4>

              {structured.qualifications.mandatory &&
                structured.qualifications.mandatory.length > 0 && (
                  <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-[13px] font-[650] text-[#f5f5f5]">
                        Mandatory requirements
                      </span>
                    </div>
                    <ul className="space-y-2 text-[13px] text-[#8a8a8a] pl-2">
                      {structured.qualifications.mandatory.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-[#5c5c5c] shrink-0 mt-0.5">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {structured.qualifications.preferred &&
                structured.qualifications.preferred.length > 0 && (
                  <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#60a5fa]" />
                      <span className="text-[13px] font-[650] text-[#f5f5f5]">
                        Preferred qualifications
                      </span>
                    </div>
                    <ul className="space-y-2 text-[13px] text-[#8a8a8a] pl-2">
                      {structured.qualifications.preferred.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-[#5c5c5c] shrink-0 mt-0.5">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* Section 5: Key Responsibilities */}
          {structured.responsibilities && structured.responsibilities.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">
                Key responsibilities.
              </h4>
              <ul className="space-y-2 text-[13px] text-[#8a8a8a]">
                {structured.responsibilities.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 size={14} className="text-[#5c5c5c] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 6: Benefits & Perks */}
          {structured.benefits && structured.benefits.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">
                Benefits & perks.
              </h4>
              <ul className="space-y-2 text-[13px] text-[#8a8a8a]">
                {structured.benefits.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <Sparkles size={14} className="text-[#60a5fa] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
