import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useEffect, useRef } from "react";
import { EASE, Magnetic, btnOutline, btnPrimary, useReady } from "./motion";
import { HeroVisual } from "./HeroVisual";

const words = ["Hire", "on", "evidence,", "not", "guesswork."];

export function Hero() {
  const ready = useReady();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const sx = useSpring(mx, { stiffness: 120, damping: 20 });
  const sy = useSpring(my, { stiffness: 120, damping: 20 });
  const mask = useMotionTemplate`radial-gradient(220px circle at ${sx}px ${sy}px, black, transparent)`;

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches || reduce) return;
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    mx.set(w * 0.3);
    my.set(h * 0.3);
    const a = animate(mx, [w * 0.2, w * 0.8, w * 0.5, w * 0.2], { duration: 18, repeat: Infinity, ease: "easeInOut" });
    const b = animate(my, [h * 0.25, h * 0.4, h * 0.15, h * 0.25], { duration: 14, repeat: Infinity, ease: "easeInOut" });
    return () => {
      a.stop();
      b.stop();
    };
  }, [reduce, mx, my]);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  const t = (d: number) => ({ duration: reduce ? 0.4 : 0.9, ease: EASE, delay: reduce ? 0 : d });

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={onMove}
      className="relative flex min-h-screen flex-col items-center overflow-hidden pb-28 pt-36"
    >
      <div aria-hidden className="dot-grid absolute inset-0" />
      <motion.div aria-hidden className="dot-grid-bright absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }} />

      <div className="container-x relative flex flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={t(0)}
          className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-foreground"
        >
          Early access
        </motion.span>

        <h1 className="text-display mt-8 max-w-[1100px]">
          {words.map((w, i) => (
            <span key={w} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className="relative inline-block"
                initial={{ y: reduce ? 0 : "110%", opacity: reduce ? 0 : 1 }}
                animate={ready ? { y: 0, opacity: 1 } : {}}
                transition={t(0.1 + i * 0.06)}
              >
                {w}
                {w === "evidence," && (
                  <motion.span
                    aria-hidden
                    className="absolute bottom-[0.04em] left-0 h-[2px] w-[calc(100%-0.25em)] origin-left bg-foreground"
                    initial={{ scaleX: reduce ? 1 : 0 }}
                    animate={ready ? { scaleX: 1 } : {}}
                    transition={t(0.9)}
                  />
                )}
              </motion.span>
              {i < words.length - 1 && <span>&nbsp;</span>}
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={t(0.5)}
          className="text-lead mt-8 max-w-[600px] text-muted-foreground"
        >
          HireSense matches resumes to roles, runs multilingual AI interviews, and gives recruiters a report they can audit.
          People make every decision.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={t(0.6)}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Magnetic>
            <a href="#join" className={btnPrimary}>Request early access</a>
          </Magnetic>
          <a href="#how" className={btnOutline}>See how it works</a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 40 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ ...t(0.75), duration: 1.1 }}
          className="relative mt-20 w-full max-w-[1040px]"
        >
          <HeroVisual start={ready} />
        </motion.div>
      </div>

      <div aria-hidden className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[12px] text-muted-foreground">
        Scroll
        <span className="block h-10 w-px overflow-hidden">
          <span className="animate-scroll-line block h-full w-px bg-foreground" />
        </span>
      </div>
    </section>
  );
}
