import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Cursor, Grain, SmoothScroll } from "@/components/hs/Experience";
import { Logomark } from "@/components/hs/Nav";
import { AuthCard } from "@/components/hs/AuthCard";
import { EASE } from "@/components/hs/motion";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — HireSense" },
      {
        name: "description",
        content: "Create your HireSense recruitment account.",
      },
      { property: "og:title", content: "Sign up — HireSense" },
      {
        property: "og:description",
        content: "Auditable, evidence-first recruitment and AI interview platform.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between overflow-hidden">
      <SmoothScroll />
      <Cursor />
      <Grain />

      {/* Subtle background dot grid */}
      <div
        className="pointer-events-none absolute inset-0 dot-grid opacity-35"
        aria-hidden="true"
      />

      {/* Ambient center radial vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.025),transparent_70%)]"
        aria-hidden="true"
      />

      {/* Minimal Top Navigation */}
      <header className="relative z-20 flex w-full items-center justify-between px-6 py-6 sm:px-10 max-w-[1240px] mx-auto">
        <Link
          to="/"
          className="group flex items-center gap-2.5 font-semibold text-foreground transition-opacity hover:opacity-90"
        >
          <Logomark />
          <span className="text-[17px] font-semibold tracking-tight">HireSense</span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/80 px-4 py-2 text-[13px] font-medium text-muted-foreground backdrop-blur-md transition-colors hover:border-hairline-strong hover:bg-field hover:text-foreground"
        >
          <ArrowLeft size={14} />
          <span>Back to home</span>
        </Link>
      </header>

      {/* Centered Auth Card Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center w-full">
          {/* Card Presentation with Signup tab selected by default */}
          <AuthCard defaultTab="signup" />
        </div>
      </main>

      {/* Minimalist Footer Note */}
      <footer className="relative z-20 pb-6 pt-2 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[12px] text-muted-foreground"
        >
          <span>© 2026 HireSense Inc.</span>
          <span className="hidden sm:inline">·</span>
          <span>Sample interface · illustrative</span>
          <span className="hidden sm:inline">·</span>
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy & AI Ethics
          </Link>
        </motion.div>
      </footer>
    </div>
  );
}
