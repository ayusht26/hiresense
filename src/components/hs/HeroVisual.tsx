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
const rows: { name: string; status: Status; from?: number }[] = [
  { name: "Python", status: "match", from: 1 },
  { name: "FastAPI", status: "match", from: 1 },
  { name: "PostgreSQL", status: "match", from: 5 },
  { name: "Docker", status: "match", from: 3 },
  { name: "Cloud deployment", status: "partial", from: 3 },
  { name: "Kubernetes", status: "unclear" },
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

export function HeroVisual({ start }: { start: boolean }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hlRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const dotRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [paths, setPaths] = useState<Record<number, string>>({});

  useEffect(() => {
    if (reduce) {
      setPhase(4);
      return;
    }
    if (!start) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers = PHASE_AT.map((at, i) => setTimeout(() => setPhase(i), at));
      timers.push(setTimeout(run, LOOP));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [start, reduce]);

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

  // score
  const score = useMotionValue(reduce ? 82 : 0);
  const rounded = useTransform(score, (v) => Math.round(v).toString());
  useEffect(() => {
    const c = animate(score, scored ? 82 : 0, { duration: reduce ? 0 : scored ? 1.4 : 0.5, ease: EASE });
    return () => c.stop();
  }, [scored, reduce, score]);

  // tilt during hold
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 80, damping: 18 });
  const sry = useSpring(ry, { stiffness: 80, damping: 18 });
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== 4 || reduce) {
      rx.set(0);
      ry.set(0);
    }
  }, [phase, reduce, rx, ry]);
  const onMove = (e: React.PointerEvent) => {
    if (phase !== 4 || reduce || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 4);
    rx.set(-py * 4);
  };

  const lineDelay = (i: number) => SCAN_START - 0.8 + (i / lines.length) * SCAN_DUR + 0.1;
  const rowDelay = (i: number) => {
    const r = rows[i];
    if (r.from === undefined) return 0.4;
    return 0.1 + lineDelay(r.from) * 0.4 + i * 0.12 + 0.9;
  };

  return (
    <div style={{ perspective: 1200 }} onPointerMove={onMove} onPointerLeave={() => { rx.set(0); ry.set(0); }}>
      <motion.div
        ref={cardRef}
        style={{ rotateX: srx, rotateY: sry }}
        className="overflow-hidden rounded-card border border-hairline bg-surface text-left"
        role="img"
        aria-label="Illustrative sample report: a resume is scanned and matched against a requirement matrix, scoring 82 out of 100 with all mandatory requirements passed."
      >
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-3.5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full border border-hairline-strong" />
            ))}
          </div>
          <span className="text-[12px] text-muted-foreground">Sample report · illustrative</span>
        </div>

        <div ref={bodyRef} className="relative grid gap-8 p-5 sm:p-8 md:grid-cols-2 md:gap-16">
          {/* Resume */}
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
              {/* scan line */}
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

          {/* Matrix */}
          <div>
            <div className="mb-5 text-[12px] font-semibold text-muted-foreground">Requirement matrix</div>
            <ul className="space-y-2">
              {rows.map((r, i) => {
                const lit = chips || (reduce && phase === 4);
                return (
                  <li key={r.name} className="flex items-center justify-between rounded-tile bg-field px-4 py-2.5">
                    <motion.span
                      className="text-[14px]"
                      initial={false}
                      animate={{ color: lit && r.status !== "unclear" ? "var(--foreground)" : "var(--faint)" }}
                      transition={{ duration: 0.3, delay: lit ? rowDelay(i) : 0 }}
                    >
                      {r.name}
                    </motion.span>
                    <span className="flex items-center gap-2">
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

          {/* connectors + chips (desktop layout only) */}
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
              return (
                <motion.span
                  key={`c${k}`}
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 hidden rounded-full border border-hairline-strong bg-surface px-2 py-0.5 text-[11px] font-semibold md:block"
                  style={{ offsetPath: `path("${d}")`, offsetRotate: "0deg" }}
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={
                    chips
                      ? { offsetDistance: "100%", opacity: [0, 1, 1, 0] }
                      : { offsetDistance: "0%", opacity: 0 }
                  }
                  transition={chips ? { duration: 1.2, ease: EASE, delay: 0.3 + i * 0.12 } : { duration: 0 }}
                >
                  {rows[i].name === "Cloud deployment" ? "AWS" : rows[i].name}
                </motion.span>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
}
