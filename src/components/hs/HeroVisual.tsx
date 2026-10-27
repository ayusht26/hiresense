import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EASE } from "./motion";

// Phases: 0 init, 1 scan, 2 chips, 3 score, 4 hold, 5 reset
const PHASE_AT = [0, 800, 2000, 4500, 6000, 8200];
const LOOP = 9000;

type Line = { w: number; text?: string; hl?: [string, string] };
const lines: Line[] = [
  { w: 46 },
  { w: 88, text: "Built REST services with FastAPI", hl: ["FastAPI", "b"] },
  { w: 72 },
  { w: 80, text: "Deployed with Docker on AWS", hl: ["Docker on AWS", "d"] },
  { w: 64 },
  { w: 70, text: "PostgreSQL schema design", hl: ["PostgreSQL", "p"] },
  { w: 84 },
  { w: 58, text: "Led a team of 4" },
  { w: 76 },
];

type Status = "match" | "partial" | "unclear";

function PythonLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M11.914 2c-5.04 0-4.72 2.19-4.72 2.19l.01 2.27h4.8v.69H5.2S2 6.78 2 11.9c0 5.1 2.75 4.9 2.75 4.9h1.64v-2.3s-.09-2.75 2.7-2.75h4.64s2.57.04 2.57-2.51V4.64S16.96 2 11.914 2zm-2.63 1.72a.85.85 0 110 1.7.85.85 0 010-1.7z"
        fill="#387EB8"
      />
      <path
        d="M12.086 22c5.04 0 4.72-2.19 4.72-2.19l-.01-2.27h-4.8v-.69h6.8s3.2.37 3.2-4.75c0-5.1-2.75-4.9-2.75-4.9h-1.64v2.3s.09 2.75-2.7 2.75H10.2s-2.57-.04-2.57 2.51v4.6s-.62 2.65 4.456 2.65zm2.63-1.72a.85.85 0 110-1.7.85.85 0 010 1.7z"
        fill="#FFE873"
      />
    </svg>
  );
}

function FastApiLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="11" fill="#05998B" />
      <path
        d="M12.8 4L6.8 13.2h4.8l-1.6 6.8 7.2-9.6h-5.2l1.8-6.4z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function PostgresLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="22" height="22" x="1" y="1" rx="5" fill="#336791" />
      <path
        d="M12 5.5c-2.4 0-4.2 1.4-4.5 3.5-.2 2 .7 3.6 1.4 4.4.1.2.2.4.2.7v1.2c0 .4.3.7.7.7h.4c.4 0 .7-.3.7-.7v-.9c.5.2 1.1.3 1.6.3s1.1-.1 1.6-.3v.9c0 .4.3.7.7.7h.4c.4 0 .7-.3.7-.7V14.3c0-.3.1-.5.2-.7.7-.8 1.6-2.4 1.4-4.4-.3-2.1-2.1-3.5-4.5-3.5zm-1.8 5.5c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9zm3.6 0c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function DockerLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M13.98 11.08h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19h-2.12a.19.19 0 00-.19.19v1.88c0 .1.08.19.19.19m-2.95-5.43h2.12a.19.19 0 00.19-.19V3.57a.19.19 0 00-.19-.18h-2.12a.19.19 0 00-.19.18v1.89c0 .1.08.19.19.19m0 2.71h2.12a.19.19 0 00.19-.18V6.29a.19.19 0 00-.19-.18h-2.12a.19.19 0 00-.19.18v1.89c0 .1.08.18.19.18m-2.93 0h2.12a.19.19 0 00.18-.18V6.29a.19.19 0 00-.18-.18H8.1a.19.19 0 00-.19.18v1.89c0 .1.09.18.19.18m-2.97 0h2.12a.19.19 0 00.19-.18V6.29a.19.19 0 00-.19-.18H5.14a.19.19 0 00-.19.18v1.89c0 .1.09.18.19.18m5.9 2.72h2.11a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19h-2.11a.19.19 0 00-.19.19v1.88c0 .1.08.19.19.19m-2.93 0h2.12a.19.19 0 00.18-.19V9.01a.19.19 0 00-.18-.19h-2.12a.19.19 0 00-.19.19v1.88c0 .1.09.19.19.19m-2.97 0h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19H5.14a.19.19 0 00-.19.19v1.88c0 .1.09.19.19.19m-2.93 0h2.12a.19.19 0 00.19-.19V9.01a.19.19 0 00-.19-.19H2.21a.19.19 0 00-.19.19v1.88c0 .1.09.19.19.19m21.75 1.54a4.42 4.42 0 00-2.32-1.5 4.26 4.26 0 00-1.77-.12c-.63.15-1.2.47-1.68.91-.08.08-.17.17-.25.26a6 6 0 00-1.74-1.13H1.82a1.82 1.82 0 00-1.82 1.82v.23c0 .41.07.81.2 1.2C1.3 18.06 4.67 20.43 11.08 20.43c7.1 0 11.83-3.67 12.87-9.35z"
        fill="#2496ED"
      />
    </svg>
  );
}

function CloudAwsLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
        fill="#FF9900"
        fillOpacity="0.2"
        stroke="#FF9900"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 15.2c3 1.9 6 1.9 9 0"
        stroke="#FF9900"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15.2 14.3l1.8 1.1-1.1 1.7"
        stroke="#FF9900"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KubernetesLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M12 0a1.14 1.14 0 00-.57.15L2.83 5.12a1.16 1.16 0 00-.58 1v9.93c0 .41.22.78.58 1l8.6 4.96a1.15 1.15 0 001.14 0l8.6-4.96c.36-.21.58-.58.58-1V6.11a1.16 1.16 0 00-.58-1L12.57.15A1.14 1.14 0 0012 0z"
        fill="#326CE5"
      />
      <path
        d="M12 2.38l6.79 3.92-2.02 3.5-2.83-1.63a3.52 3.52 0 00-3.88 0L7.24 9.8 5.22 6.3 12 2.38zm-7.9 5.9l2.02 3.5v3.26l-2.02 3.5V8.28zm15.77 0v7.26l-2.02-3.5v-3.26l2.02-3.5zm-7.89 1.48a2.32 2.32 0 110 4.63 2.32 2.32 0 010-4.63zm-3.84 3.73l2.83 1.63a3.52 3.52 0 003.87 0l2.83-1.63 2.02 3.5-6.79 3.92-6.78-3.92 2.02-3.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

const rows: {
  name: string;
  status: Status;
  from?: number;
  chipLabel?: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { name: "Python", status: "match", from: 1, Icon: PythonLogo },
  { name: "FastAPI", status: "match", from: 1, Icon: FastApiLogo },
  { name: "PostgreSQL", status: "match", from: 5, Icon: PostgresLogo },
  { name: "Docker", status: "match", from: 3, Icon: DockerLogo },
  { name: "Cloud deployment", status: "partial", from: 3, chipLabel: "AWS", Icon: CloudAwsLogo },
  { name: "Kubernetes", status: "unclear", Icon: KubernetesLogo },
];

const SCAN_START = 0.8;
const SCAN_DUR = 2.4;

function Dot({ status, on, delay }: { status: Status; on: boolean; delay: number }) {
  return (
    <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full border border-hairline-strong">
      {status !== "unclear" && (
        <motion.span
          className="absolute inset-[-1px] rounded-full bg-foreground"
          style={status === "partial" ? { clipPath: "inset(0 50% 0 0)" } : undefined}
          initial={false}
          animate={{ scale: on ? [0, 1.35, 1] : 0 }}
          transition={{ duration: on ? 0.45 : 0.4, ease: EASE, delay: on ? delay : 0 }}
        />
      )}
    </span>
  );
}

export function HeroVisual({
  start,
}: {
  start: boolean;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hlRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const dotRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [paths, setPaths] = useState<Record<number, string>>({});

  // 3D tilt & skew motion values
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const skewX = useMotionValue(0);
  const skewY = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 140, damping: 20 });
  const sry = useSpring(ry, { stiffness: 140, damping: 20 });
  const sSkewX = useSpring(skewX, { stiffness: 140, damping: 20 });
  const sSkewY = useSpring(skewY, { stiffness: 140, damping: 20 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);

  // Manual replay handler
  const replay = () => {
    setCycle((c) => c + 1);
  };

  // State machine loop
  useEffect(() => {
    if (reduce) {
      setPhase(4);
      return;
    }
    if (!start) {
      setPhase(0);
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = () => {
      timers = PHASE_AT.map((at, i) =>
        setTimeout(() => {
          setPhase(i);
        }, at)
      );

      // Schedule next iteration at LOOP, but pause while user is actively hovering the window
      timers.push(
        setTimeout(() => {
          if (isHoveredRef.current) {
            setPhase(4);
            return;
          }
          schedule();
        }, LOOP)
      );
    };

    schedule();
    return () => timers.forEach(clearTimeout);
  }, [start, reduce, cycle]);

  // Pointer move handler active ONLY when hovering directly over the specific window
  const onCardMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !cardRef.current) return;
    isHoveredRef.current = true;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    const dx = (e.clientX - cardCenterX) / (rect.width * 0.5);
    const dy = (e.clientY - cardCenterY) / (rect.height * 0.5);

    const px = Math.max(-1, Math.min(1, dx));
    const py = Math.max(-1, Math.min(1, dy));

    const maxTilt = 9;
    rx.set(-py * maxTilt);
    ry.set(px * maxTilt);
    skewX.set(-px * 1.5);
    skewY.set(py * 1.0);
  };

  const onCardLeave = () => {
    isHoveredRef.current = false;
    rx.set(0);
    ry.set(0);
    skewX.set(0);
    skewY.set(0);
  };

  useLayoutEffect(() => {
    const measure = () => {
      const body = bodyRef.current;
      if (!body) return;
      const b = body.getBoundingClientRect();
      const next: Record<number, string> = {};
      rows.forEach((r, i) => {
        if (r.from === undefined) return;
        const h = hlRefs.current[r.from];
        const d = dotRefs.current[i];
        if (!h || !d) return;
        const hr = h.getBoundingClientRect();
        const dr = d.getBoundingClientRect();
        const x1 = hr.right - b.left;
        const y1 = hr.top + hr.height / 2 - b.top;
        const x2 = dr.left - b.left - 8;
        const y2 = dr.top + dr.height / 2 - b.top;
        const mx = (x1 + x2) / 2;
        next[i] = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      });
      setPaths(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (bodyRef.current) ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, []);

  const active = phase >= 1 && phase < 5;
  const chips = phase >= 2 && phase < 5;
  const scored = phase >= 3 && phase < 5;
  const visible = phase < 5;

  // Score rolling animation
  const score = useMotionValue(reduce ? 82 : 0);
  const rounded = useTransform(score, (v) => Math.round(v).toString());
  useEffect(() => {
    const c = animate(score, scored ? 82 : 0, { duration: reduce ? 0 : scored ? 1.4 : 0.5, ease: EASE });
    return () => c.stop();
  }, [scored, reduce, score]);

  const lineDelay = (i: number) => SCAN_START - 0.8 + (i / lines.length) * SCAN_DUR + 0.1;
  const rowDelay = (i: number) => {
    const r = rows[i];
    if (r.from === undefined) return 0.4;
    return 0.1 + lineDelay(r.from) * 0.4 + i * 0.12 + 0.9;
  };

  return (
    <div style={{ perspective: 1200 }} className="relative">
      <motion.div
        ref={cardRef}
        onPointerMove={onCardMove}
        onPointerLeave={onCardLeave}
        style={{
          rotateX: srx,
          rotateY: sry,
          skewX: sSkewX,
          skewY: sSkewY,
          transformStyle: "preserve-3d",
        }}
        className="overflow-hidden rounded-card border border-hairline bg-surface text-left shadow-2xl transition-shadow duration-300"
        role="img"
        aria-label="Illustrative sample report: a resume is scanned and matched against a requirement matrix, scoring 82 out of 100 with all mandatory requirements passed."
      >
        {/* Mac-style Window Top Bar */}
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]"
                aria-label="Close"
              />
              <span
                className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]"
                aria-label="Minimize"
              />
              <span
                className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]"
                aria-label="Expand"
              />
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">Sample report · illustrative</span>
          </div>

          <button
            type="button"
            onClick={replay}
            className="group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:bg-field hover:text-foreground"
            title="Replay animation"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3 transition-transform duration-300 group-hover:-rotate-90"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Replay</span>
          </button>
        </div>

        <div ref={bodyRef} className="relative grid gap-8 p-5 sm:p-8 md:grid-cols-2 md:gap-16">
          {/* Left Column: Resume */}
          <div className="relative">
            <div className="mb-5 text-[12px] font-semibold text-muted-foreground">resume.pdf</div>
            <div className="relative space-y-3.5">
              {lines.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: reduce ? 1 : 0 }}
                  animate={{ opacity: visible ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: visible && phase === 0 ? i * 0.06 : 0 }}
                  className="flex h-5 items-center"
                >
                  {l.text ? (
                    <motion.span
                      className="truncate text-[14px]"
                      initial={false}
                      animate={{ color: active ? "var(--foreground)" : "var(--faint)" }}
                      transition={{ duration: 0.3, delay: active && phase === 1 ? lineDelay(i) : 0 }}
                    >
                      {l.hl ? (
                        <>
                          {l.text.slice(0, l.text.indexOf(l.hl[0]))}
                          <span ref={(el) => { hlRefs.current[i] = el; }} className="relative inline-block px-0.5">
                            <motion.span
                              aria-hidden
                              className="absolute inset-0 origin-left rounded-[4px] bg-field"
                              initial={false}
                              animate={{ scaleX: active ? 1 : 0 }}
                              transition={{ duration: 0.5, ease: EASE, delay: active && phase === 1 ? lineDelay(i) + 0.15 : 0 }}
                            />
                            <span className="relative">{l.hl[0]}</span>
                          </span>
                        </>
                      ) : (
                        l.text
                      )}
                    </motion.span>
                  ) : (
                    <motion.span
                      className="block h-2 rounded-full"
                      style={{ width: `${l.w}%` }}
                      initial={false}
                      animate={{ backgroundColor: active ? "var(--hairline-strong)" : "var(--field)" }}
                      transition={{ duration: 0.3, delay: active && phase === 1 ? lineDelay(i) : 0 }}
                    />
                  )}
                </motion.div>
              ))}

              {/* Scan Line */}
              {!reduce && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-2 inset-y-0"
                  initial={{ y: "0%", opacity: 0 }}
                  animate={phase === 1 ? { y: "100%", opacity: [0, 1, 1, 0] } : { y: "0%", opacity: 0 }}
                  transition={phase === 1 ? { duration: SCAN_DUR, ease: "linear" } : { duration: 0 }}
                >
                  <div className="relative h-px w-full bg-foreground">
                    <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-accent" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column: Requirement Matrix */}
          <div>
            <div className="mb-5 text-[12px] font-semibold text-muted-foreground">Requirement matrix</div>
            <ul className="space-y-2">
              {rows.map((r, i) => {
                const lit = chips || (reduce && phase === 4);
                const IconComponent = r.Icon;
                return (
                  <li key={r.name} className="flex items-center justify-between rounded-tile bg-field px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-hairline/60 bg-surface/90">
                        <IconComponent className="h-4 w-4 shrink-0" />
                      </span>
                      <motion.span
                        className="truncate text-[14px]"
                        initial={false}
                        animate={{ color: lit && r.status !== "unclear" ? "var(--foreground)" : "var(--faint)" }}
                        transition={{ duration: 0.3, delay: lit ? rowDelay(i) : 0 }}
                      >
                        {r.name}
                      </motion.span>
                    </div>

                    <span className="flex shrink-0 items-center gap-2 pl-2">
                      {r.status === "unclear" && (
                        <motion.span
                          className="text-[12px] text-muted-foreground"
                          initial={false}
                          animate={{ opacity: lit ? 1 : 0 }}
                          transition={{ duration: 0.3, delay: lit ? 1.6 : 0 }}
                        >
                          unclear
                        </motion.span>
                      )}
                      <span ref={(el) => { dotRefs.current[i] = el; }} className="inline-flex">
                        <Dot status={r.status} on={lit} delay={rowDelay(i)} />
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 rounded-tile bg-field p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted-foreground">Overall match</span>
                <span className="tabular text-h4">
                  <motion.span>{rounded}</motion.span>
                  <span className="text-muted-foreground"> / 100</span>
                </span>
              </div>
              <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-hairline">
                <motion.div
                  className="h-full origin-left bg-foreground"
                  initial={{ scaleX: reduce ? 0.82 : 0 }}
                  animate={{ scaleX: scored ? 0.82 : 0 }}
                  transition={{ duration: reduce ? 0 : scored ? 1.4 : 0.5, ease: EASE }}
                />
              </div>
              <motion.p
                className="mt-3 text-[12px] text-muted-foreground"
                initial={false}
                animate={{ opacity: scored ? 1 : 0 }}
                transition={{ duration: 0.4, delay: scored ? 1.2 : 0 }}
              >
                Mandatory requirements: all passed.
              </motion.p>
            </div>
          </div>

          {/* Connectors + Chips (Desktop layout only) */}
          {!reduce && (
            <svg aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block">
              {Object.entries(paths).map(([k, d]) => {
                const i = Number(k);
                return (
                  <motion.path
                    key={k}
                    d={d}
                    fill="none"
                    stroke="var(--hairline-strong)"
                    strokeWidth={1}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={chips ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.9, ease: EASE, delay: chips ? i * 0.12 : 0 }}
                  />
                );
              })}
            </svg>
          )}

          {!reduce &&
            Object.entries(paths).map(([k, d]) => {
              const i = Number(k);
              const r = rows[i];
              const ChipIcon = r.Icon;
              return (
                <motion.span
                  key={`c${k}`}
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 hidden items-center gap-1.5 rounded-full border border-hairline-strong bg-surface px-2 py-0.5 text-[11px] font-semibold md:flex"
                  style={{ offsetPath: `path("${d}")`, offsetRotate: "0deg" }}
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={
                    chips
                      ? { offsetDistance: "100%", opacity: [0, 1, 1, 0] }
                      : { offsetDistance: "0%", opacity: 0 }
                  }
                  transition={chips ? { duration: 1.2, ease: EASE, delay: 0.3 + i * 0.12 } : { duration: 0 }}
                >
                  <ChipIcon className="h-3 w-3 shrink-0" />
                  <span>{r.chipLabel ?? r.name}</span>
                </motion.span>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
}
