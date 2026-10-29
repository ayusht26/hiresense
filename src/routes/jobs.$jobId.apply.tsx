import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/jobs/$jobId/apply")({
  head: () => ({
    meta: [{ title: "Apply — HireSense" }],
  }),
  component: JobApplyPlaceholderPage,
});

function JobApplyPlaceholderPage() {
  const { jobId } = Route.useParams();

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between overflow-hidden selection:bg-[#f5f5f5] selection:text-[#0a0a0a]">
      {/* Background Dot Grid */}
      <div aria-hidden className="dot-grid absolute inset-0 pointer-events-none opacity-60" />

      {/* Top Navigation Pill */}
      <header className="relative pt-8 px-4 flex justify-center w-full z-20">
        <nav
          aria-label="Application navigation"
          className="flex h-12 w-full max-w-[680px] items-center justify-between rounded-full bg-[#141414] px-6 border border-[rgba(255,255,255,0.10)]"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[14px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
          >
            <ArrowLeft size={16} />
            <span>Back to jobs</span>
          </Link>

          <Link
            to="/"
            className="text-[16px] font-[650] tracking-tight text-[#f5f5f5] transition-opacity hover:opacity-80"
          >
            HireSense
          </Link>

          <span className="text-[12px] font-[600] px-3 py-1 rounded-full bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)]">
            Early access
          </span>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[540px] rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-8 sm:p-12 text-center shadow-2xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[30%] bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] text-[#f5f5f5]">
            <Clock size={28} className="text-[#8a8a8a]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-[32px] sm:text-[36px] font-[650] leading-[1.08] tracking-tight text-[#f5f5f5]">
              Application flow coming soon.
            </h1>
            <p className="text-[15px] font-[450] leading-relaxed text-[#8a8a8a]">
              The candidate application and multilingual AI interview pipeline is currently in
              development for early access.
            </p>
          </div>

          <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-5 text-left space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-[650] text-[#f5f5f5]">
              <Sparkles size={14} className="text-[#8a8a8a]" />
              <span>What happens during application</span>
            </div>
            <ul className="space-y-2 text-[13px] font-[450] text-[#8a8a8a]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#f5f5f5] shrink-0 mt-0.5" />
                <span>Resume PDF upload with entity and skill span extraction</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#f5f5f5] shrink-0 mt-0.5" />
                <span>Transparent semantic compatibility score against job requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#f5f5f5] shrink-0 mt-0.5" />
                <span>Multilingual conversational AI interview session (English & Hindi)</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#f5f5f5] px-8 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98]"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-4 px-4 text-center">
        <p className="text-[12px] font-[450] text-[#8a8a8a]">
          © 2026 HireSense Inc. · Application pipeline preview
        </p>
      </footer>
    </div>
  );
}
