import { useState } from "react";
import { X, Trash2, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type {
  Job,
  StructuredJobListing,
  TechStackItem,
  RequirementType,
} from "@/types/database.types";

interface EditJobModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedJob: Job) => void;
}

export function EditJobModal({ job, isOpen, onClose, onSuccess }: EditJobModalProps) {
  const initialStructured = (job.generated_posting || {}) as StructuredJobListing;

  const [structured, setStructured] = useState<StructuredJobListing>({
    title: job.title || initialStructured.title || "",
    company: job.company_name || initialStructured.company || "",
    location: job.location || initialStructured.location || null,
    work_mode: (job.work_mode as any) || initialStructured.work_mode || null,
    employment_type: job.job_type || initialStructured.employment_type || null,
    experience: job.experience || initialStructured.experience || null,
    salary: initialStructured.salary || {
      min: job.salary_min,
      max: job.salary_max,
      currency: job.salary_currency || "INR",
      period: job.salary_period || "month",
      display: job.salary_display || "Not specified",
    },
    about_role: initialStructured.about_role || "",
    responsibilities: initialStructured.responsibilities || [],
    qualifications: initialStructured.qualifications || { mandatory: [], preferred: [] },
    tech_stack: initialStructured.tech_stack || [],
    benefits: initialStructured.benefits || [],
  });

  const [status, setStatus] = useState<"draft" | "published">((job.status as any) || "published");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Quick inputs
  const [newResp, setNewResp] = useState("");
  const [newMandatory, setNewMandatory] = useState("");
  const [newPreferred, setNewPreferred] = useState("");
  const [newTechName, setNewTechName] = useState("");
  const [newTechReqType, setNewTechReqType] = useState<RequirementType>("mandatory");

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);

    try {
      const updates = {
        title: structured.title.trim(),
        company_name: structured.company.trim(),
        location: structured.location || null,
        work_mode: structured.work_mode || null,
        job_type: structured.employment_type || null,
        experience: structured.experience || null,
        salary_min: structured.salary?.min ?? null,
        salary_max: structured.salary?.max ?? null,
        salary_currency: structured.salary?.currency || "INR",
        salary_period: structured.salary?.period || "month",
        salary_display: structured.salary?.display || "Not specified",
        generated_posting: structured as any,
        status,
      };

      const { data, error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", job.id)
        .select()
        .single();

      if (error) throw error;

      onSuccess(data as Job);
      onClose();
    } catch (err: any) {
      console.error("Update job error:", err);
      setSaveError(err?.message || "Failed to update listing.");
    } finally {
      setSaving(false);
    }
  };

  const removeResp = (idx: number) => {
    setStructured({
      ...structured,
      responsibilities: structured.responsibilities.filter((_, i) => i !== idx),
    });
  };

  const addResp = () => {
    if (!newResp.trim()) return;
    setStructured({
      ...structured,
      responsibilities: [...structured.responsibilities, newResp.trim()],
    });
    setNewResp("");
  };

  const removeMandatory = (idx: number) => {
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        mandatory: structured.qualifications.mandatory.filter((_, i) => i !== idx),
      },
    });
  };

  const addMandatory = () => {
    if (!newMandatory.trim()) return;
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        mandatory: [...structured.qualifications.mandatory, newMandatory.trim()],
      },
    });
    setNewMandatory("");
  };

  const removePreferred = (idx: number) => {
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        preferred: structured.qualifications.preferred.filter((_, i) => i !== idx),
      },
    });
  };

  const addPreferred = () => {
    if (!newPreferred.trim()) return;
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        preferred: [...structured.qualifications.preferred, newPreferred.trim()],
      },
    });
    setNewPreferred("");
  };

  const removeTech = (idx: number) => {
    setStructured({
      ...structured,
      tech_stack: structured.tech_stack.filter((_, i) => i !== idx),
    });
  };

  const addTech = () => {
    if (!newTechName.trim()) return;
    const name = newTechName.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const item: TechStackItem = {
      name,
      canonical_name: name,
      category: "other",
      devicon_slug: slug,
      requirement_type: newTechReqType,
    };
    setStructured({
      ...structured,
      tech_stack: [...structured.tech_stack, item],
    });
    setNewTechName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-[800px] max-h-[92vh] overflow-y-auto rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.12)] p-6 sm:p-8 shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[30%] bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] text-[#f5f5f5]">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-[650] tracking-tight text-[#f5f5f5]">
                Edit job listing.
              </h2>
              <p className="text-[13px] text-[#8a8a8a] font-[450]">
                Update role specifications, requirements, or publication status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          {saveError && (
            <div className="rounded-[16px] bg-red-950/40 border border-red-500/30 p-4 text-[13px] text-red-200">
              {saveError}
            </div>
          )}

          {/* Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Job title</label>
              <input
                type="text"
                required
                value={structured.title}
                onChange={(e) => setStructured({ ...structured, title: e.target.value })}
                className="w-full h-10 px-3.5 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Company name</label>
              <input
                type="text"
                required
                value={structured.company}
                onChange={(e) => setStructured({ ...structured, company: e.target.value })}
                className="w-full h-10 px-3.5 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
            </div>
          </div>

          {/* Location, Work mode, Employment type, Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Location</label>
              <input
                type="text"
                placeholder="Not specified"
                value={structured.location || ""}
                onChange={(e) => setStructured({ ...structured, location: e.target.value || null })}
                className="w-full h-10 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Work mode</label>
              <select
                value={structured.work_mode || ""}
                onChange={(e) =>
                  setStructured({
                    ...structured,
                    work_mode: (e.target.value as any) || null,
                  })
                }
                className="w-full h-10 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              >
                <option value="">Not specified</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Job type</label>
              <input
                type="text"
                placeholder="Full-time"
                value={structured.employment_type || ""}
                onChange={(e) =>
                  setStructured({ ...structured, employment_type: e.target.value || null })
                }
                className="w-full h-10 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Experience</label>
              <input
                type="text"
                placeholder="Not specified"
                value={structured.experience || ""}
                onChange={(e) =>
                  setStructured({ ...structured, experience: e.target.value || null })
                }
                className="w-full h-10 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
            </div>
          </div>

          {/* Salary display & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Salary display</label>
              <input
                type="text"
                value={structured.salary?.display || ""}
                onChange={(e) =>
                  setStructured({
                    ...structured,
                    salary: {
                      ...structured.salary,
                      display: e.target.value || "Not specified",
                    },
                  })
                }
                className="w-full h-10 px-3.5 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-[600] text-[#8a8a8a]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 px-3.5 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              >
                <option value="draft">Draft (hidden from students)</option>
                <option value="published">Published (visible in feed)</option>
              </select>
            </div>
          </div>

          {/* About Role */}
          <div className="space-y-1">
            <label className="text-[12px] font-[600] text-[#8a8a8a]">About the role</label>
            <textarea
              rows={3}
              value={structured.about_role}
              onChange={(e) => setStructured({ ...structured, about_role: e.target.value })}
              className="w-full p-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
            />
          </div>

          {/* Responsibilities list editor */}
          <div className="space-y-2">
            <label className="text-[12px] font-[600] text-[#8a8a8a]">Key responsibilities</label>
            <div className="space-y-2">
              {structured.responsibilities.map((resp, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-[16px] bg-[#1a1a1a]">
                  <span className="text-[13px] text-[#f5f5f5] flex-1 leading-snug">{resp}</span>
                  <button
                    type="button"
                    onClick={() => removeResp(idx)}
                    className="p-1 text-[#707070] hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a responsibility..."
                  value={newResp}
                  onChange={(e) => setNewResp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addResp())}
                  className="flex-1 h-9 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                />
                <button
                  type="button"
                  onClick={addResp}
                  className="h-9 px-4 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-[#f5f5f5] hover:bg-[#262626]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Mandatory Qualifications */}
          <div className="space-y-2">
            <label className="text-[12px] font-[600] text-[#8a8a8a]">
              Mandatory qualifications
            </label>
            <div className="space-y-2">
              {structured.qualifications.mandatory.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-[16px] bg-[#1a1a1a]">
                  <span className="text-[13px] text-[#f5f5f5] flex-1">{q}</span>
                  <button
                    type="button"
                    onClick={() => removeMandatory(idx)}
                    className="p-1 text-[#707070] hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add mandatory qualification..."
                  value={newMandatory}
                  onChange={(e) => setNewMandatory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMandatory())}
                  className="flex-1 h-9 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                />
                <button
                  type="button"
                  onClick={addMandatory}
                  className="h-9 px-4 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-[#f5f5f5] hover:bg-[#262626]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Preferred Qualifications */}
          <div className="space-y-2">
            <label className="text-[12px] font-[600] text-[#8a8a8a]">
              Preferred qualifications
            </label>
            <div className="space-y-2">
              {structured.qualifications.preferred.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-[16px] bg-[#1a1a1a]">
                  <span className="text-[13px] text-[#8a8a8a] flex-1">{q}</span>
                  <button
                    type="button"
                    onClick={() => removePreferred(idx)}
                    className="p-1 text-[#707070] hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add preferred qualification..."
                  value={newPreferred}
                  onChange={(e) => setNewPreferred(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPreferred())}
                  className="flex-1 h-9 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                />
                <button
                  type="button"
                  onClick={addPreferred}
                  className="h-9 px-4 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-[#f5f5f5] hover:bg-[#262626]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Tech Stack list editor */}
          <div className="space-y-2">
            <label className="text-[12px] font-[600] text-[#8a8a8a]">Tech stack & Skills</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {structured.tech_stack.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-[600] text-[#f5f5f5]">
                      {item.canonical_name || item.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)]">
                      {item.requirement_type}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTech(idx)}
                    className="p-1 text-[#707070] hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Tech name (e.g. React, PostgreSQL)"
                value={newTechName}
                onChange={(e) => setNewTechName(e.target.value)}
                className="h-9 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5] flex-1 min-w-[140px]"
              />
              <select
                value={newTechReqType}
                onChange={(e) => setNewTechReqType(e.target.value as any)}
                className="h-9 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              >
                <option value="mandatory">Mandatory</option>
                <option value="preferred">Preferred</option>
                <option value="contextual">Contextual</option>
                <option value="informational">Informational</option>
              </select>
              <button
                type="button"
                onClick={addTech}
                className="h-9 px-4 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-[#f5f5f5] hover:bg-[#262626]"
              >
                Add tech
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1a1a1a] px-6 text-[14px] font-[600] text-[#8a8a8a] hover:text-[#f5f5f5] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#f5f5f5] px-8 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
