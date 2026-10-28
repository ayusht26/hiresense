import { useState } from "react";
import {
  X,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateJobListingServerFn } from "@/lib/ai-listing";
import type {
  Job,
  StructuredJobListing,
  TechStackItem,
  RequirementType,
} from "@/types/database.types";
import { TechLogoTile } from "./TechLogoTile";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newJob: Job) => void;
  recruiterId: string;
  defaultCompany?: string;
}

export function AddJobModal({
  isOpen,
  onClose,
  onSuccess,
  recruiterId,
  defaultCompany = "",
}: AddJobModalProps) {
  // Step: "input" | "preview"
  const [step, setStep] = useState<"input" | "preview">("input");
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");

  // Raw Form State (Exactly 4 fields per spec)
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState(defaultCompany || "HireSense Demo Co");
  const [description, setDescription] = useState("");
  const [salary, setSalary] = useState("");

  // Loading & Error States
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Structured AI Draft State
  const [structured, setStructured] = useState<StructuredJobListing | null>(null);
  const [modelName, setModelName] = useState<string>("openai/gpt-4o-mini");
  const [promptVersion, setPromptVersion] = useState<string>("v1.0.0");

  // New item inputs for editing structured arrays
  const [newResp, setNewResp] = useState("");
  const [newMandatory, setNewMandatory] = useState("");
  const [newPreferred, setNewPreferred] = useState("");
  const [newTechName, setNewTechName] = useState("");
  const [newTechCategory, setNewTechCategory] = useState("frontend");
  const [newTechReqType, setNewTechReqType] = useState<RequirementType>("mandatory");
  const [newBenefit, setNewBenefit] = useState("");

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerationError(null);

    if (!title.trim() || !company.trim() || !description.trim()) {
      setGenerationError("Please fill out Job title, Company name, and Job description.");
      return;
    }

    try {
      setGenerating(true);

      const result = await generateJobListingServerFn({
        data: {
          title: title.trim(),
          company: company.trim(),
          description: description.trim(),
          salary: salary.trim() || undefined,
        },
      });

      setStructured(result.structured);
      setModelName(result.model_name);
      setPromptVersion(result.prompt_version);
      setStep("preview");
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setGenerationError(
        err?.message || "Failed to generate structured listing. You may retry or fill manually.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!structured) return;
    setSaveError(null);
    setSaving(true);

    try {
      const payload = {
        recruiter_id: recruiterId,
        company_name: structured.company || company,
        title: structured.title || title,
        location: structured.location || null,
        work_mode: structured.work_mode || null,
        job_type: structured.employment_type || null,
        experience: structured.experience || null,
        salary_min: structured.salary?.min ?? null,
        salary_max: structured.salary?.max ?? null,
        salary_currency: structured.salary?.currency || "INR",
        salary_period: structured.salary?.period || "month",
        salary_display: structured.salary?.display || salary || "Not specified",
        raw_input: description,
        generated_posting: structured as any,
        model_name: modelName,
        prompt_version: promptVersion,
        status,
      };

      const { data, error } = await supabase.from("jobs").insert(payload).select().single();

      if (error) {
        throw error;
      }

      onSuccess(data as Job);
      onClose();
    } catch (err: any) {
      console.error("Save listing error:", err);
      setSaveError(err?.message || "Failed to save job listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Helpers for editing structured draft
  // -------------------------------------------------------------
  const removeResp = (index: number) => {
    if (!structured) return;
    setStructured({
      ...structured,
      responsibilities: structured.responsibilities.filter((_, i) => i !== index),
    });
  };

  const addResp = () => {
    if (!structured || !newResp.trim()) return;
    setStructured({
      ...structured,
      responsibilities: [...structured.responsibilities, newResp.trim()],
    });
    setNewResp("");
  };

  const removeMandatory = (index: number) => {
    if (!structured) return;
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        mandatory: structured.qualifications.mandatory.filter((_, i) => i !== index),
      },
    });
  };

  const addMandatory = () => {
    if (!structured || !newMandatory.trim()) return;
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        mandatory: [...structured.qualifications.mandatory, newMandatory.trim()],
      },
    });
    setNewMandatory("");
  };

  const removePreferred = (index: number) => {
    if (!structured) return;
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        preferred: structured.qualifications.preferred.filter((_, i) => i !== index),
      },
    });
  };

  const addPreferred = () => {
    if (!structured || !newPreferred.trim()) return;
    setStructured({
      ...structured,
      qualifications: {
        ...structured.qualifications,
        preferred: [...structured.qualifications.preferred, newPreferred.trim()],
      },
    });
    setNewPreferred("");
  };

  const removeTech = (index: number) => {
    if (!structured) return;
    setStructured({
      ...structured,
      tech_stack: structured.tech_stack.filter((_, i) => i !== index),
    });
  };

  const addTech = () => {
    if (!structured || !newTechName.trim()) return;
    const name = newTechName.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const item: TechStackItem = {
      name,
      canonical_name: name,
      category: newTechCategory,
      devicon_slug: slug,
      requirement_type: newTechReqType,
    };
    setStructured({
      ...structured,
      tech_stack: [...structured.tech_stack, item],
    });
    setNewTechName("");
  };

  const removeBenefit = (index: number) => {
    if (!structured) return;
    setStructured({
      ...structured,
      benefits: structured.benefits.filter((_, i) => i !== index),
    });
  };

  const addBenefit = () => {
    if (!structured || !newBenefit.trim()) return;
    setStructured({
      ...structured,
      benefits: [...structured.benefits, newBenefit.trim()],
    });
    setNewBenefit("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-[840px] max-h-[92vh] overflow-y-auto rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.12)] p-6 sm:p-8 shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[30%] bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] text-[#f5f5f5]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-[650] tracking-tight text-[#f5f5f5]">
                {step === "input" ? "Add new job listing." : "Review structured listing."}
              </h2>
              <p className="text-[13px] text-[#8a8a8a] font-[450]">
                {step === "input"
                  ? "Write one messy paragraph. AI will structure it into Indeed-style specifications."
                  : "Keep the human in the loop. Review or edit every AI-extracted field before publishing."}
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

        {/* ========================================================= */}
        {/* STEP 1: RAW INPUT FORM                                    */}
        {/* ========================================================= */}
        {step === "input" && (
          <form onSubmit={handleGenerate} className="mt-6 space-y-5">
            {generationError && (
              <div className="rounded-[16px] bg-red-950/40 border border-red-500/30 p-4 text-[13px] text-red-200 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <p>{generationError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Job Title */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-[600] text-[#f5f5f5] block">
                  Job title <span className="text-[#8a8a8a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-[16px] bg-[#1f1f1f] border-0 text-[#f5f5f5] placeholder-[#5c5c5c] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                />
              </div>

              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-[600] text-[#f5f5f5] block">
                  Company name <span className="text-[#8a8a8a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HireSense"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full h-11 px-4 rounded-[16px] bg-[#1f1f1f] border-0 text-[#f5f5f5] placeholder-[#5c5c5c] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                />
              </div>
            </div>

            {/* Salary (Free text) */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-[600] text-[#f5f5f5] block">
                Salary (optional free text)
              </label>
              <input
                type="text"
                placeholder="e.g. 15-20 LPA, ₹40,000 – ₹60,000 per month, or $100k-$130k"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full h-11 px-4 rounded-[16px] bg-[#1f1f1f] border-0 text-[#f5f5f5] placeholder-[#5c5c5c] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
              <span className="text-[11px] text-[#707070]">
                If left blank, it will show as "Not specified".
              </span>
            </div>

            {/* Job Description (Large Textarea) */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-[600] text-[#f5f5f5] block">
                Job description (one paragraph with all your notes){" "}
                <span className="text-[#8a8a8a]">*</span>
              </label>
              <textarea
                required
                rows={7}
                placeholder="Paste or write everything here: role summary, skills required (React, Node, Postgres), experience (3+ years), location/remote, responsibilities, perks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 rounded-[16px] bg-[#1f1f1f] border-0 text-[#f5f5f5] placeholder-[#5c5c5c] text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
              />
            </div>

            {/* Action Row */}
            <div className="pt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#1a1a1a] px-6 text-[14px] font-[600] text-[#8a8a8a] hover:text-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={generating}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f5f5f5] px-7 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98] disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Structuring listing...</span>
                  </>
                ) : (
                  <>
                    <span>Generate listing</span>
                    <Sparkles size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* STEP 2: PREVIEW & HUMAN-IN-THE-LOOP EDITOR                */}
        {/* ========================================================= */}
        {step === "preview" && structured && (
          <div className="mt-6 space-y-6">
            {saveError && (
              <div className="rounded-[16px] bg-red-950/40 border border-red-500/30 p-4 text-[13px] text-red-200">
                {saveError}
              </div>
            )}

            {/* Tab switch between Editor and Preview */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTab("edit")}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-[600] transition-colors ${
                    previewTab === "edit"
                      ? "bg-[#f5f5f5] text-[#0a0a0a]"
                      : "bg-[#1a1a1a] text-[#8a8a8a] hover:text-[#f5f5f5]"
                  }`}
                >
                  <Edit2 size={13} />
                  <span>Edit fields</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("preview")}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-[600] transition-colors ${
                    previewTab === "preview"
                      ? "bg-[#f5f5f5] text-[#0a0a0a]"
                      : "bg-[#1a1a1a] text-[#8a8a8a] hover:text-[#f5f5f5]"
                  }`}
                >
                  <Eye size={13} />
                  <span>Indeed layout preview</span>
                </button>
              </div>

              <div className="text-[12px] text-[#707070] font-mono">
                {modelName} · {promptVersion}
              </div>
            </div>

            {/* EDIT VIEW */}
            {previewTab === "edit" && (
              <div className="space-y-5 text-left">
                {/* Title & Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[12px] font-[600] text-[#8a8a8a]">Job title</label>
                    <input
                      type="text"
                      value={structured.title}
                      onChange={(e) => setStructured({ ...structured, title: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-[600] text-[#8a8a8a]">Company name</label>
                    <input
                      type="text"
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
                      onChange={(e) =>
                        setStructured({
                          ...structured,
                          location: e.target.value || null,
                        })
                      }
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
                        setStructured({
                          ...structured,
                          employment_type: e.target.value || null,
                        })
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
                        setStructured({
                          ...structured,
                          experience: e.target.value || null,
                        })
                      }
                      className="w-full h-10 px-3 rounded-[16px] bg-[#1f1f1f] text-[#f5f5f5] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>
                </div>

                {/* Salary Display */}
                <div className="space-y-1">
                  <label className="text-[12px] font-[600] text-[#8a8a8a]">
                    Salary formatted display
                  </label>
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
                  <label className="text-[12px] font-[600] text-[#8a8a8a]">
                    Key responsibilities
                  </label>
                  <div className="space-y-2">
                    {structured.responsibilities.map((resp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-[16px] bg-[#1a1a1a]"
                      >
                        <span className="text-[13px] text-[#f5f5f5] flex-1 leading-snug">
                          {resp}
                        </span>
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
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-[16px] bg-[#1a1a1a]"
                      >
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
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-[16px] bg-[#1a1a1a]"
                      >
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
                  <label className="text-[12px] font-[600] text-[#8a8a8a]">
                    Tech stack & Skills (tagged with requirement types)
                  </label>
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

                  {/* Add tech input */}
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
              </div>
            )}

            {/* PREVIEW TAB */}
            {previewTab === "preview" && (
              <div className="space-y-6 rounded-[24px] bg-[#0d0d0d] p-6 border border-[rgba(255,255,255,0.08)]">
                <div>
                  <h3 className="text-[26px] font-[650] text-[#f5f5f5] tracking-tight">
                    {structured.title}.
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-[14px] text-[#9a9a9a]">
                    <span className="font-[600] text-[#f5f5f5]">{structured.company}</span>
                    <span>•</span>
                    <span>{structured.location || "Location not specified"}</span>
                    <span>•</span>
                    <span className="font-[600] text-[#f5f5f5]">
                      {structured.salary?.display || "Salary not specified"}
                    </span>
                  </div>
                </div>

                {structured.about_role && (
                  <div className="space-y-2">
                    <h4 className="text-[15px] font-[650] text-[#f5f5f5]">About the role.</h4>
                    <p className="text-[14px] text-[#9a9a9a] leading-relaxed">
                      {structured.about_role}
                    </p>
                  </div>
                )}

                {structured.tech_stack && structured.tech_stack.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[15px] font-[650] text-[#f5f5f5]">
                      Tech stack ({structured.tech_stack.length}).
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {structured.tech_stack.map((item, idx) => (
                        <TechLogoTile key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTION ROW: Save as Draft or Publish */}
            <div className="pt-5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#1a1a1a] px-5 text-[14px] font-[600] text-[#8a8a8a] hover:text-[#f5f5f5] transition-colors"
              >
                Back to raw input
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("draft")}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] px-6 text-[14px] font-[600] text-[#f5f5f5] transition-all hover:bg-[#262626] disabled:opacity-50"
                >
                  Save as draft
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("published")}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#f5f5f5] px-7 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? "Publishing..." : "Publish listing"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
