import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Bookmark,
  Share2,
  Edit3,
  Globe,
  ShieldCheck,
} from "lucide-react";
import type { Job, StructuredJobListing } from "@/types/database.types";
import { TechLogoTile } from "./TechLogoTile";

interface JobDetailPanelProps {
  job: Job;
  isRecruiter?: boolean;
  onEdit?: (job: Job) => void;
  onToggleStatus?: (job: Job) => void;
  onDelete?: (job: Job) => void;
}

export function JobDetailPanel({
  job,
  isRecruiter = false,
  onEdit,
  onToggleStatus,
  onDelete,
}: JobDetailPanelProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const isDraft = job.status === "draft";

  return (
    <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 text-left space-y-8 overflow-y-auto">
      {/* Top Header & Core Info */}
      <div className="space-y-4 border-b border-[rgba(255,255,255,0.08)] pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-[#f5f5f5] border border-[rgba(255,255,255,0.10)]">
              <Building2 size={13} className="text-[#8a8a8a]" />
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
              onClick={() => setIsBookmarked(!isBookmarked)}
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

        {/* Primary CTA Row */}
        <div className="pt-2 flex items-center gap-3 flex-wrap">
          {!isRecruiter ? (
            <Link
              to="/jobs/$jobId/apply"
              params={{ jobId: job.id }}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#f5f5f5] px-8 text-[15px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98]"
            >
              Apply now
            </Link>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(job)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#f5f5f5] px-5 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98]"
                >
                  <Edit3 size={14} />
                  <span>Edit listing</span>
                </button>
              )}

              {onToggleStatus && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(job)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] px-5 text-[14px] font-[600] text-[#f5f5f5] transition-all hover:bg-[#262626]"
                >
                  {isDraft ? "Publish listing" : "Unpublish to draft"}
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(job)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-transparent px-4 text-[13px] font-[450] text-[#707070] transition-colors hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {copied && <span className="text-[13px] text-[#8a8a8a]">Link copied to clipboard!</span>}
        </div>
      </div>

      {/* Section 1: Job Details Matrix */}
      <div className="space-y-3">
        <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">Job details.</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
            <span className="text-[12px] font-[450] text-[#707070] block">Employment type</span>
            <span className="text-[14px] font-[600] text-[#f5f5f5] mt-0.5 block">
              {employmentType}
            </span>
          </div>

          <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
            <span className="text-[12px] font-[450] text-[#707070] block">
              Work mode & Location
            </span>
            <span className="text-[14px] font-[600] text-[#f5f5f5] mt-0.5 block capitalize">
              {workMode} {location !== "Not specified" ? `(${location})` : ""}
            </span>
          </div>

          <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
            <span className="text-[12px] font-[450] text-[#707070] block">Compensation</span>
            <span className="text-[14px] font-[600] text-[#f5f5f5] mt-0.5 block">
              {salaryDisplay}
            </span>
          </div>

          <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-3.5">
            <span className="text-[12px] font-[450] text-[#707070] block">Experience</span>
            <span className="text-[14px] font-[600] text-[#f5f5f5] mt-0.5 block">{experience}</span>
          </div>
        </div>
      </div>

      {/* Section 2: About the Role */}
      {structured.about_role && (
        <div className="space-y-3">
          <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">About the role.</h4>
          <p className="text-[15px] font-[450] leading-relaxed text-[#9a9a9a]">
            {structured.about_role}
          </p>
        </div>
      )}

      {/* Section 3: Key Responsibilities */}
      {structured.responsibilities && structured.responsibilities.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">
            Key responsibilities.
          </h4>
          <ul className="space-y-2 text-[14px] font-[450] text-[#9a9a9a]">
            {structured.responsibilities.map((resp, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f5f5f5] mt-2 shrink-0" />
                <span className="leading-relaxed">{resp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 4: Qualifications (Mandatory vs Preferred) */}
      {structured.qualifications &&
        (structured.qualifications.mandatory?.length > 0 ||
          structured.qualifications.preferred?.length > 0) && (
          <div className="space-y-4">
            <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">
              Qualifications & Requirements.
            </h4>

            {structured.qualifications.mandatory?.length > 0 && (
              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#f5f5f5]" />
                  <span className="text-[13px] font-[650] text-[#f5f5f5]">
                    Mandatory requirements
                  </span>
                </div>
                <ul className="space-y-1.5 text-[14px] text-[#8a8a8a] pl-5 list-disc">
                  {structured.qualifications.mandatory.map((q, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {structured.qualifications.preferred?.length > 0 && (
              <div className="rounded-[16px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[#8a8a8a]" />
                  <span className="text-[13px] font-[600] text-[#8a8a8a]">
                    Preferred qualifications
                  </span>
                </div>
                <ul className="space-y-1.5 text-[14px] text-[#707070] pl-5 list-disc">
                  {structured.qualifications.preferred.map((q, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      {/* Section 5: Tech Stack with Devicon Logos */}
      {structured.tech_stack && structured.tech_stack.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">
              Tech stack & Skills.
            </h4>
            <span className="text-[12px] font-[450] text-[#707070]">
              {structured.tech_stack.length} technologies
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {structured.tech_stack.map((item, idx) => (
              <TechLogoTile key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Benefits */}
      {structured.benefits && structured.benefits.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[16px] font-[650] text-[#f5f5f5] tracking-tight">
            Perks & Benefits.
          </h4>
          <ul className="space-y-2 text-[14px] font-[450] text-[#9a9a9a]">
            {structured.benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a8a] mt-2 shrink-0" />
                <span className="leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 7: Audit Trail & Integrity Note */}
      <div className="pt-6 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-4 text-[12px] font-[450] text-[#5c5c5c] flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#8a8a8a]" />
          <span>Human in the loop · Recruiter verified</span>
        </div>

        {job.model_name && (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>Model: {job.model_name}</span>
            {job.prompt_version && <span>· {job.prompt_version}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
