import { Link } from "@tanstack/react-router";
import { type ReactNode, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
  navLink?: {
    to: string;
    label: string;
  };
  className?: string;
}

export function AuthLayout({ children, navLink, className }: AuthLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const sx = useSpring(mx, { stiffness: 120, damping: 20 });
  const sy = useSpring(my, { stiffness: 120, damping: 20 });
  const mask = useMotionTemplate`radial-gradient(240px circle at ${sx}px ${sy}px, black, transparent)`;

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      className="relative min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between overflow-hidden selection:bg-[#f5f5f5] selection:text-[#0a0a0a]"
    >
      {/* Interactive Dot Grid Background from Hero */}
      <div aria-hidden className="dot-grid absolute inset-0 pointer-events-none" />
      {!reduce && (
        <motion.div
          aria-hidden
          className="dot-grid-bright absolute inset-0 pointer-events-none"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        />
      )}

      {/* Top Floating Pill Navigation */}
      <header className="relative pt-8 px-4 flex justify-center w-full z-20">
        <nav
          aria-label="Authentication navigation"
          className="flex h-12 w-full max-w-[440px] items-center justify-between rounded-full bg-[#141414] px-6 border border-[rgba(255,255,255,0.10)]"
        >
          <Link
            to="/"
            className="text-[16px] font-[650] tracking-tight text-[#f5f5f5] transition-opacity hover:opacity-80"
          >
            HireSense
          </Link>

          {navLink && (
            <Link
              to={navLink.to}
              className="text-[14px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
            >
              {navLink.label}
            </Link>
          )}
        </nav>
      </header>

      {/* Main Centered Content Column */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className={cn("w-full max-w-[440px] mx-auto", className)}>{children}</div>
      </main>

      {/* Subtle Footer Note */}
      <footer className="relative z-10 pb-8 pt-4 px-4 text-center">
        <p className="text-[12px] font-[450] text-[#8a8a8a]">
          <span>© 2026 HireSense Inc.</span>
          <span className="mx-2">·</span>
          <span>Sample interface · illustrative</span>
        </p>
      </footer>
    </div>
  );
}
