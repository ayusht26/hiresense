import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { createContext, useContext, useRef, type ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const ReadyContext = createContext(false);
export const useReady = () => useContext(ReadyContext);

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "header" | "li";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}

export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const reach = Math.max(r.width, r.height) / 2 + 80;
    if (dist > reach) {
      x.set(0);
      y.set(0);
      return;
    }
    const f = (1 - dist / reach) * 8;
    x.set((dx / (dist || 1)) * f);
    y.set((dy / (dist || 1)) * f);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`-m-[40px] inline-block p-[40px] ${className ?? ""}`}
    >
      <motion.div style={{ x: sx, y: sy }}>{children}</motion.div>
    </div>
  );
}

export const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90";
export const btnOutline =
  "inline-flex h-12 items-center justify-center rounded-full border border-hairline-strong px-6 text-[15px] font-semibold text-foreground transition-colors hover:bg-field";
