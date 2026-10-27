import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useRef, useState } from "react";
import { EASE, btnPrimary } from "./motion";

export function Logomark({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`squircle inline-flex h-8 w-8 items-center justify-center text-[15px] font-bold ${
        dark ? "bg-inverse-foreground text-inverse" : "bg-inverse text-inverse-foreground"
      }`}
    >
      H
    </span>
  );
}

const links = [
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const last = useRef(0);
  const [hidden, setHidden] = useState(false);
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
        className="flex w-full max-w-[880px] items-center justify-between gap-4 rounded-full border border-hairline bg-surface py-2 pl-3 pr-2"
      >
        <a href="#top" className="flex items-center gap-2.5 rounded-full pr-2 font-semibold">
          <Logomark />
          <span className="hidden sm:inline">HireSense</span>
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-4 py-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:bg-field hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#join" className={`${btnPrimary} h-10 px-5 text-[14px]`}>
          Request early access
        </a>
      </nav>
    </motion.header>
  );
}
