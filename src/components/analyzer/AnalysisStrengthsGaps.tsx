import { CheckCircle2, AlertTriangle, Sparkles, HelpCircle, ArrowUpRight } from "lucide-react";
import type { StrengthItem, GapItem } from "@/lib/ai-analyzer";

interface AnalysisStrengthsGapsProps {
  summary: string;
  strengths: StrengthItem[];
  gaps: GapItem[];
}

export function AnalysisStrengthsGaps({ summary, strengths, gaps }: AnalysisStrengthsGapsProps) {
  return (
    <div className="space-y-6">
      {/* 1. Executive Summary Card */}
      <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-7 space-y-3">
        <div className="flex items-center gap-2 text-[13px] font-[650] text-[#f5f5f5]">
          <Sparkles size={16} className="text-[#60a5fa]" />
          <span>Profile Summary & Analysis Overview</span>
        </div>
        <p className="text-[15px] font-[450] leading-relaxed text-[#9a9a9a]">
          {summary}
        </p>
      </div>

      {/* 2. Side-by-Side: Strengths vs Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: What the person has (Strengths) */}
        <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-[17px] font-[650] text-[#f5f5f5] tracking-tight">
                  What you have.
                </h4>
                <span className="text-[12px] text-[#8a8a8a]">
                  {strengths.length} verified strengths with resume evidence
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {strengths.length === 0 ? (
              <p className="text-[13px] text-[#8a8a8a]">No verified matching skills found.</p>
            ) : (
              strengths.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-[16px] bg-[#1a1a1a] p-4 border border-[rgba(255,255,255,0.06)] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[14px] font-[650] text-[#f5f5f5]">
                      {item.skill_or_area}
                    </span>
                    <span className="text-[11px] font-[600] px-2 py-0.5 rounded-full bg-[#262626] text-[#8a8a8a] capitalize">
                      {item.category}
                    </span>
                  </div>

                  {item.evidence_quote && (
                    <div className="rounded-[10px] bg-[#141414] p-2.5 border-l-2 border-emerald-400/80 text-[12px] font-mono text-[#a0a0a0] leading-relaxed">
                      "{item.evidence_quote}"
                    </div>
                  )}

                  <p className="text-[12px] text-[#707070] leading-normal">{item.relevance}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: What the person is lacking in (Critical Gaps) */}
        <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4 className="text-[17px] font-[650] text-[#f5f5f5] tracking-tight">
                  What you are lacking in.
                </h4>
                <span className="text-[12px] text-[#8a8a8a]">
                  {gaps.length} areas to address or verify for this role
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {gaps.length === 0 ? (
              <div className="rounded-[16px] bg-[#1a1a1a] p-6 text-center space-y-2 border border-[rgba(255,255,255,0.06)]">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                <p className="text-[14px] font-[650] text-[#f5f5f5]">No major gaps detected!</p>
                <p className="text-[12px] text-[#8a8a8a]">
                  Your resume demonstrates coverage for all primary mandatory and preferred criteria.
                </p>
              </div>
            ) : (
              gaps.map((item, idx) => {
                const isCritical = item.severity === "critical";
                return (
                  <div
                    key={idx}
                    className={`rounded-[16px] bg-[#1a1a1a] p-4 border space-y-2.5 ${
                      isCritical
                        ? "border-amber-500/30 bg-amber-500/[0.02]"
                        : "border-[rgba(255,255,255,0.06)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-[650] text-[#f5f5f5]">
                          {item.requirement}
                        </span>
                        <span className="text-[11px] font-[450] text-[#707070] capitalize">
                          ({item.type})
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-[650] px-2.5 py-0.5 rounded-full border ${
                          isCritical
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {item.severity === "critical" ? "Critical Gap" : "Moderate Gap"}
                      </span>
                    </div>

                    <p className="text-[13px] text-[#9a9a9a] leading-relaxed">{item.impact}</p>

                    {item.recommendation && (
                      <div className="rounded-[10px] bg-[#141414] p-3 text-[12px] text-[#e0e0e0] flex items-start gap-2 border border-[rgba(255,255,255,0.06)]">
                        <ArrowUpRight size={14} className="text-[#60a5fa] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-[#f5f5f5] font-[600]">Recommendation: </strong>
                          {item.recommendation}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
