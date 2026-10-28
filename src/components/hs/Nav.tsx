import { Link, useRouterState } from "@tanstack/react-router";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useRef, useState } from "react";
import { UserRoundSearch } from "lucide-react";
import { EASE, btnPrimary } from "./motion";

export function Logomark({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <span
      className={`squircle inline-flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
        dark ? "bg-inverse-foreground text-inverse" : "bg-inverse text-inverse-foreground"
      } ${className}`}
      aria-hidden="true"
    >
      <UserRoundSearch size={17} strokeWidth={2.2} className="shrink-0" />
    </span>
  );
}

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/about", label: "About us", isRoute: true },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const last = useRef(0);
  const [hidden, setHidden] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useMotionValueEvent(scrollY, "change", (v) => {
    const d = v - last.current;
    if (v < 80) setHidden(false);
    else if (d > 4) setHidden(true);
    else if (d < -4) setHidden(false);
    last.current = v;
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <nav
        aria-label="Primary"
        className="flex w-full max-w-[880px] items-center justify-between gap-4 rounded-full border border-hairline bg-surface py-2 pl-3 pr-2 shadow-2xl shadow-black/40"
      >
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-full pr-2 font-semibold transition-opacity hover:opacity-90"
        >
          <Logomark />
          <span className="hidden sm:inline">HireSense</span>
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const isActive = l.isRoute && pathname === l.href;
            return (
              <li key={l.href}>
                {l.isRoute ? (
                  <Link
                    to={l.href}
                    className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
                      isActive
                        ? "bg-field text-foreground"
                        : "text-muted-foreground hover:bg-field hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    href={l.href}
                    className="rounded-full px-4 py-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:bg-field hover:text-foreground"
                  >
                    {l.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        <a href="/#join" className={`${btnPrimary} h-10 px-5 text-[14px]`}>
          Request early access
        </a>
      </nav>
    </motion.header>
  );
}
