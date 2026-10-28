import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
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
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between selection:bg-[#f5f5f5] selection:text-[#0a0a0a]">
      {/* Top Floating Pill Navigation */}
      <header className="pt-8 px-4 flex justify-center w-full z-20">
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
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className={cn("w-full max-w-[440px] mx-auto", className)}>{children}</div>
      </main>

      {/* Subtle Footer Note */}
      <footer className="pb-8 pt-4 px-4 text-center">
        <p className="text-[12px] font-[450] text-[#8a8a8a]">
          <span>© 2026 HireSense Inc.</span>
          <span className="mx-2">·</span>
          <span>Sample interface · illustrative</span>
        </p>
      </footer>
    </div>
  );
}
