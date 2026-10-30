import { CheckCircle2, Clock, CircleAlert, HelpCircle } from "lucide-react";
import type { RequirementAuditItem } from "@/lib/ai-analyzer";

interface RequirementMatrixCardProps {
  matrix: RequirementAuditItem[];
}

export function RequirementMatrixCard({ matrix }: RequirementMatrixCardProps) {
  const getStatusBadge = (status: RequirementAuditItem["status"]) => {
    switch (status) {
      case "matched":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Matched</span>
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Partial</span>
          </span>
        );
      case "missing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-zinc-800 text-[#8a8a8a] border border-[rgba(255,255,255,0.08)]">
            <span className="h-1.5 w-1.5 rounded-full border border-[#8a8a8a]" />
            <span>Missing</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
        <div>
          <h3 className="text-[20px] sm:text-[22px] font-[650] tracking-tight text-[#f5f5f5]">
            Requirement audit matrix.
          </h3>
          <p className="text-[13px] text-[#8a8a8a] mt-0.5">
            Every score maps directly to an explicit job qualification and resume text span.
          </p>
        </div>

        <span className="text-[12px] font-mono text-[#707070] self-start sm:self-center">
          {matrix.filter((m) => m.status === "matched").length} / {matrix.length} verified
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)] text-[12px] font-[600] text-[#707070]">
              <th className="pb-3 pr-4 font-[600]">Requirement</th>
              <th className="pb-3 px-4 font-[600]">Classification</th>
              <th className="pb-3 px-4 font-[600]">Status</th>
              <th className="pb-3 pl-4 font-[600]">Resume Evidence / Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[13px]">
            {matrix.map((row, idx) => (
              <tr key={idx} className="group hover:bg-[#1a1a1a]/50 transition-colors">
                <td className="py-3.5 pr-4 font-[600] text-[#f5f5f5] max-w-[220px]">
                  {row.requirement}
                </td>
                <td className="py-3.5 px-4 text-[#8a8a8a] capitalize whitespace-nowrap">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[11px] font-[500] border border-[rgba(255,255,255,0.06)]">
                    {row.type}
                  </span>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(row.status)}</td>
                <td className="py-3.5 pl-4 text-[#9a9a9a] font-mono text-[12px] leading-relaxed max-w-md">
                  {row.resume_evidence}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
