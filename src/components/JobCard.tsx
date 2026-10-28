import { useState } from "react";
import { Bookmark, MapPin, Building2, Clock, Sparkles } from "lucide-react";
import type { Job, StructuredJobListing } from "@/types/database.types";

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect: (job: Job) => void;
  isRecruiter?: boolean;
  onEdit?: (job: Job) => void;
  onToggleStatus?: (job: Job) => void;
}

export function JobCard({ job, isSelected = false, onSelect, isRecruiter = false }: JobCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Parse structured data safely
  const structured = (job.generated_posting || {}) as Partial<StructuredJobListing>;
  const isDraft = job.status === "draft";
  const isPublished = job.status === "published";

  // Check if job is "New" (created within last 5 days)
  const isNew = (() => {
    const createdDate = new Date(job.created_at).getTime();
    const now = Date.now();
    return now - createdDate < 5 * 24 * 60 * 60 * 1000;
  })();

  const salaryDisplay = job.salary_display || structured.salary?.display || "Salary not specified";

  const workMode = job.work_mode || structured.work_mode;
  const location = job.location || structured.location || "Location not specified";
  const employmentType = job.job_type || structured.employment_type || "Full-time";

  const topTech = (structured.tech_stack || []).slice(0, 3);

  return (
    <article
      onClick={() => onSelect(job)}
      className={`group relative cursor-pointer rounded-[24px] p-5 transition-all text-left border ${
        isSelected
          ? "bg-[#1a1a1a] border-[#f5f5f5]"
          : "bg-[#141414] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] hover:bg-[#171717]"
      }`}
    >
      {/* Top Chips Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isNew && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#f5f5f5] text-[11px] font-[600] border border-[rgba(255,255,255,0.15)]">
              New
            </span>
          )}

          {/* Accent #0066ff reserved for commercial / status signal */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#0066ff]/15 text-[#0066ff] text-[11px] font-[600] border border-[#0066ff]/30">
            Easily apply
          </span>

          {workMode && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#8a8a8a] text-[11px] font-[600] border border-[rgba(255,255,255,0.06)] capitalize">
              {workMode}
            </span>
          )}

          {isRecruiter && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-[600] border ${
                isDraft
                  ? "bg-[#262626] text-[#8a8a8a] border-[rgba(255,255,255,0.12)]"
                  : "bg-[#1f2937] text-[#60a5fa] border-[#3b82f6]/40"
              }`}
            >
              {isDraft ? "Draft" : "Published"}
            </span>
          )}
        </div>

        {/* Bookmark Icon Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsBookmarked(!isBookmarked);
          }}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark job"}
          className="p-1.5 rounded-full text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#262626] transition-colors"
        >
          <Bookmark size={16} className={isBookmarked ? "fill-[#f5f5f5] text-[#f5f5f5]" : ""} />
        </button>
      </div>

      {/* Job Title & Company */}
      <h3 className="text-[18px] font-[650] leading-snug tracking-tight text-[#f5f5f5] group-hover:text-white transition-colors">
        {job.title}
      </h3>

      <div className="mt-1 flex items-center gap-2 text-[14px] text-[#9a9a9a] font-[450]">
        <span className="font-[600] text-[#f5f5f5]">{job.company_name}</span>
        <span>•</span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} className="text-[#8a8a8a]" />
          <span>{location}</span>
        </span>
      </div>

      {/* Salary & Details Chips */}
      <div className="mt-3.5 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center px-3 py-1 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[12px] font-[600] border border-[rgba(255,255,255,0.08)]">
          {salaryDisplay}
        </span>

        {employmentType && (
          <span className="inline-flex items-center px-3 py-1 rounded-[16px] bg-[#1a1a1a] text-[#8a8a8a] text-[12px] font-[450] border border-[rgba(255,255,255,0.06)]">
            {employmentType}
          </span>
        )}
      </div>

      {/* Tech Stack Previews */}
      {topTech.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-1.5 flex-wrap">
          {topTech.map((tech, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#141414] text-[11px] font-[450] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)]"
            >
              <span>{tech.canonical_name || tech.name}</span>
            </span>
          ))}
          {structured.tech_stack && structured.tech_stack.length > 3 && (
            <span className="text-[11px] font-[450] text-[#5c5c5c]">
              +{structured.tech_stack.length - 3} more
            </span>
          )}
        </div>
      )}
    </article>
  );
}
