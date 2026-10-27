import { AnimatePresence, frame, cancelFrame, motion, useMotionValue, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE } from "./motion";

export function SmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let update: ((d: { timestamp: number }) => void) | null = null;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const l = new Lenis({ duration: 1.1, autoRaf: false });
      lenis = l;
      update = ({ timestamp }) => l.raf(timestamp);
      frame.update(update, true);
      (window as unknown as { __lenis?: unknown }).__lenis = l;
    });
    return () => {
      cancelled = true;
      if (update) cancelFrame(update);
      lenis?.destroy();
    };
  }, [reduce]);
  return null;
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-foreground"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

export function Cursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hover, setHover] = useState(false);
  const [hidden, setHidden] = useState(true);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40 });
  const sy = useSpring(y, { stiffness: 500, damping: 40 });

  useEffect(() => {
    if (reduce) return;
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);
    document.body.classList.add("has-cursor");
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      const onInput = !!t?.closest?.("input, textarea");
      setHidden(onInput);
      setHover(!!t?.closest?.("a, button"));
    };
    const leave = () => setHidden(true);
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    return () => {
      document.body.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [reduce, x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[70] rounded-full bg-foreground mix-blend-difference"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%", width: 56, height: 56 }}
      animate={{ scale: hover ? 1 : 10 / 56, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.35, ease: EASE }}
    />
  );
}

export function Grain() {
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 z-[55] h-full w-full opacity-[0.04]">
      <filter id="hs-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#hs-grain)" />
    </svg>
  );
}

export function Preloader({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (reduce) {
      setShow(false);
      onDone();
      return;
    }
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, [reduce, onDone]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          key="pre"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background"
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <motion.span
            className="text-h3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            HireSense
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
