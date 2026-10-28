import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { UserRoundSearch } from "lucide-react";
import { EASE, btnPrimary } from "./motion";
import { scrollToTarget } from "@/lib/scroll";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

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
  const [session, setSession] = useState<Session | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // If user manually touches wheel or touchmove while scrolling, yield control
  useEffect(() => {
    const cancelProgrammatic = () => {
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
        last.current = window.scrollY;
      }
    };
    window.addEventListener("wheel", cancelProgrammatic, { passive: true });
    window.addEventListener("touchmove", cancelProgrammatic, { passive: true });
    return () => {
      window.removeEventListener("wheel", cancelProgrammatic);
      window.removeEventListener("touchmove", cancelProgrammatic);
    };
  }, []);

  useMotionValueEvent(scrollY, "change", (v) => {
    if (isProgrammaticScroll.current) {
      last.current = v;
      return;
    }
    const d = v - last.current;
    if (v < 80) setHidden(false);
    else if (d > 4) setHidden(true);
    else if (d < -4) setHidden(false);
    last.current = v;
  });

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return;

    const hash = href.slice(hashIndex); // e.g. '#how'
    const targetPath = href.slice(0, hashIndex) || "/";

    if (pathname === targetPath) {
      e.preventDefault();
      isProgrammaticScroll.current = true;
      setHidden(false);

      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }

      scrollToTarget(hash, {
        duration: 1.2,
        onComplete: () => {
          isProgrammaticScroll.current = false;
          last.current = scrollY.get();
          setHidden(false);
        },
      });
    } else {
      e.preventDefault();
      router.navigate({ to: targetPath, hash: hash.replace("#", "") });
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      isProgrammaticScroll.current = true;
      setHidden(false);

      if (window.location.hash) {
        window.history.pushState(null, "", "/");
      }

      scrollToTarget(0, {
        duration: 1.2,
        onComplete: () => {
          isProgrammaticScroll.current = false;
          last.current = scrollY.get();
          setHidden(false);
        },
      });
    }
  };

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
          onClick={handleLogoClick}
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
                    onClick={(e) => handleLinkClick(e, l.href)}
                    className="rounded-full px-4 py-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:bg-field hover:text-foreground"
                  >
                    {l.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {session ? (
            <Link
              to="/dashboard"
              className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
                pathname === "/dashboard"
                  ? "bg-field text-foreground"
                  : "text-muted-foreground hover:bg-field hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className={`rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors ${
                pathname === "/login"
                  ? "bg-field text-foreground"
                  : "text-muted-foreground hover:bg-field hover:text-foreground"
              }`}
            >
              Log in
            </Link>
          )}
          <Link to="/contact" className={`${btnPrimary} h-10 px-4 sm:px-5 text-[14px]`}>
            Request access
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
