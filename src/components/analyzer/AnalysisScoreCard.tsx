import { motion } from "framer-motion";
import { ShieldCheck, Info } from "lucide-react";
import type { ScoreBreakdown } from "@/lib/ai-analyzer";

interface AnalysisScoreCardProps {
  score: number;
  fitLevel: "High Fit" | "Moderate Fit" | "Developing Fit";
  breakdown: ScoreBreakdown;
  targetJobTitle: string;
  candidateName: string;
  modelUsed?: string;
}

export function AnalysisScoreCard({
  score,
  fitLevel,
  breakdown,
  targetJobTitle,
  candidateName,
  modelUsed,
}: AnalysisScoreCardProps) {
  // SVG circular gauge calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getTierColor = () => {
    if (score >= 78) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
  };

  const categories = [
    { label: "Technical & Skills Match", weight: "40%", score: breakdown.skills_score },
    { label: "Experience Fit", weight: "20%", score: breakdown.experience_score },
    { label: "Project Relevance", weight: "15%", score: breakdown.project_score },
    { label: "Education & Background", weight: "10%", score: breakdown.education_score },
    { label: "Responsibility Alignment", weight: "10%", score: breakdown.responsibility_score },
    { label: "Evidence Quality", weight: "5%", score: breakdown.evidence_quality_score },
  ];

  return (
    <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 space-y-6">
      {/* Top Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div>
          <span className="text-[12px] font-[600] text-[#8a8a8a] block">Analysis Result</span>
          <h3 className="text-[22px] sm:text-[26px] font-[650] tracking-tight text-[#f5f5f5]">
            Compatibility Fit: {score}%
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span
            className={`inline-flex items-center px-3.5 py-1 rounded-full text-[12px] font-[650] border ${getTierColor()}`}
          >
            {fitLevel}
          </span>
          <span className="text-[12px] text-[#707070] font-mono">
            {modelUsed ? `Model: ${modelUsed}` : "Evidence Verified"}
          </span>
        </div>
      </div>

      {/* Main Grid: Gauge on Left, Category Bars on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Circular Gauge */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
          <div className="relative flex items-center justify-center">
            <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background Track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-[rgba(255,255,255,0.08)]"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Arc */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-[#f5f5f5]"
                strokeWidth="10"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[40px] font-[650] text-[#f5f5f5] tracking-tight tabular-nums leading-none">
                {score}
                <span className="text-[20px] text-[#8a8a8a] font-[450]">%</span>
              </span>
              <span className="text-[12px] font-[600] text-[#8a8a8a] mt-1">Overall Fit</span>
            </div>
          </div>

          <p className="mt-4 text-[13px] text-[#8a8a8a] text-center max-w-[260px] leading-relaxed">
            Calculated against mandatory role gates and semantic evidence spans.
          </p>
        </div>

        {/* Right: Detailed Metric Bars */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between text-[13px] font-[650] text-[#f5f5f5] mb-1">
            <span>Evaluation Breakdown</span>
            <span className="text-[12px] font-[450] text-[#707070]">Weighted Formula</span>
          </div>

          {categories.map((cat, idx) => (
            <div key={idx} className="rounded-[16px] bg-[#1a1a1a] p-3 border border-[rgba(255,255,255,0.06)] space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="font-[600] text-[#f5f5f5]">{cat.label}</span>
                  <span className="text-[11px] font-[450] text-[#707070]">({cat.weight})</span>
                </div>
                <span className="font-mono text-[13px] font-[600] text-[#f5f5f5] tabular-nums">
                  {cat.score} / 100
                </span>
              </div>

              {/* Progress Track */}
              <div className="h-1.5 w-full rounded-full bg-[#141414] overflow-hidden">
                <motion.div
                  className="h-full bg-[#f5f5f5] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.score}%` }}
                  transition={{ duration: 0.9, delay: idx * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Footnote */}
      <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3 text-[12px] font-[450] text-[#707070] flex-wrap">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[#8a8a8a]" />
          <span>Audit standard: Mandatory criteria are hard gates, not hidden penalties.</span>
        </div>
        <span>Target: {targetJobTitle}</span>
      </div>
    </div>
  );
}
