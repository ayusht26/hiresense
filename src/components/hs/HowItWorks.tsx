import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { EASE, Reveal } from "./motion";
import { scrollToTarget } from "@/lib/scroll";

const steps = [
  {
    n: "01",
    title: "Match.",
    body: "Resumes and job descriptions become structured requirements. Every score links back to the line in the resume that supports it.",
  },
  {
    n: "02",
    title: "Screen.",
    body: "Set the threshold your team uses. Hard filters apply only where a role truly requires them, and every filter or override is recorded with a reason.",
  },
  {
    n: "03",
    title: "Interview.",
    body: "Candidates choose English, Hindi, or code-mixed speech. Questions come from the role and the resume, and follow-ups probe vague answers.",
  },
];

function MatchMock({ start = true }: { start?: boolean }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(reduce ? 3 : 0);
  const [lineActive, setLineActive] = useState<{ 1: boolean; 2: boolean; 3: boolean }>({
    1: false,
    2: false,
    3: false,
  });

  // State machine loop
  useEffect(() => {
    if (reduce) {
      setPhase(3);
      setLineActive({ 1: true, 2: true, 3: true });
      return;
    }

    if (!start) {
      setPhase(0);
      setLineActive({ 1: false, 2: false, 3: false });
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      // 0: Resting document
      setPhase(0);
      setLineActive({ 1: false, 2: false, 3: false });

      // 1: Scan begins
      timers.push(setTimeout(() => setPhase(1), 500));

      // Key phrase highlights as beam moves down (delayed by 0.5s)
      timers.push(
        setTimeout(() => setLineActive((prev) => ({ ...prev, 1: true })), 1700)
      );
      timers.push(
        setTimeout(() => setLineActive((prev) => ({ ...prev, 2: true })), 2400)
      );
      timers.push(
        setTimeout(() => setLineActive((prev) => ({ ...prev, 3: true })), 3100)
      );

      // 2: Scoring phase
      timers.push(setTimeout(() => setPhase(2), 3800));

      // 3: Hold completed state
      timers.push(setTimeout(() => setPhase(3), 6600));

      // Loop after 9000ms
      timers.push(setTimeout(runCycle, 9000));
    };

    runCycle();
    return () => timers.forEach(clearTimeout);
  }, [start, reduce]);

  // Rolling score counter
  const scoreMotion = useMotionValue(reduce ? 92 : 0);
  const scoreRounded = useTransform(scoreMotion, (v) => Math.round(v).toString());

  useEffect(() => {
    if (reduce) {
      scoreMotion.set(92);
      return;
    }
    const isScoring = phase >= 2 && phase <= 3;
    const ctrl = animate(scoreMotion, isScoring ? 92 : 0, {
      duration: isScoring ? 1.3 : 0.4,
      ease: EASE,
    });
    return () => ctrl.stop();
  }, [phase, reduce, scoreMotion]);

  const isScored = phase >= 2;

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-surface p-6 sm:p-8 text-left select-none">
      {/* Top Document Bar */}
      <div className="flex items-center justify-between border-b border-hairline pb-4 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="font-medium text-foreground">rohan_sharma_resume.pdf</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-foreground transition-opacity ${
                phase === 1 ? "animate-ping opacity-75" : "opacity-0"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                phase === 1 ? "bg-foreground" : isScored ? "bg-foreground" : "bg-muted-foreground/40"
              }`}
            />
          </span>
          <span className="text-[10px] tracking-wider uppercase text-muted-foreground">
            {phase === 0 ? "Ready to parse" : phase === 1 ? "OCR Scanning..." : "3 Source Matches"}
          </span>
        </div>
      </div>

      {/* Resume Document Canvas with Scanning Beam */}
      <div className="relative my-auto py-4">
        {/* Laser Scan Beam */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 top-0 h-16 origin-top z-10"
            initial={{ y: "0%", opacity: 0 }}
            animate={
              phase === 1
                ? { y: ["0%", "260%"], opacity: [0, 1, 1, 0] }
                : { y: "0%", opacity: 0 }
            }
            transition={
              phase === 1
                ? { duration: 3.1, ease: "linear" }
                : { duration: 0 }
            }
          >
            <div className="h-full w-full bg-gradient-to-t from-foreground/15 to-transparent" />
            <div className="relative h-px w-full bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              <span className="absolute left-2 -top-[3px] h-[7px] w-[7px] rounded-full bg-foreground" />
              <span className="absolute right-2 -top-[3px] h-[7px] w-[7px] rounded-full bg-foreground" />
            </div>
          </motion.div>
        )}

        {/* Candidate Resume Header */}
        <div>
          <h4 className="text-[18px] font-[650] text-foreground tracking-tight">Rohan Sharma</h4>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">Senior Backend Engineer · 6 years experience</p>
        </div>

        <div className="my-4 h-px w-full bg-hairline" />

        {/* Experience Section */}
        <div className="space-y-4">
          {/* Bullet 1 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 font-mono text-[10px] text-muted-foreground/50">01</span>
              <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-muted-foreground">
                Engineered core REST services with{" "}
                <motion.span
                  initial={false}
                  animate={
                    lineActive[1]
                      ? {
                          scale: [1, 1.08, 1],
                          backgroundColor: "rgba(16, 185, 129, 0.16)",
                          borderColor: "rgba(52, 211, 153, 0.4)",
                          color: "#34d399",
                        }
                      : {
                          scale: 1,
                          backgroundColor: "transparent",
                          borderColor: "transparent",
                          color: "var(--muted-foreground)",
                        }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="inline-block rounded-[4px] px-2 py-0.5 font-medium border"
                >
                  FastAPI & Python
                </motion.span>
                , handling 14k req/sec under peak load.
              </p>
            </div>
            <motion.span
              initial={false}
              animate={{
                opacity: lineActive[1] ? 1 : 0,
                scale: lineActive[1] ? [0.85, 1.04, 1] : 0.85,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="shrink-0 rounded-full border border-hairline-strong bg-field px-2.5 py-0.5 text-[11px] font-medium text-foreground whitespace-nowrap"
            >
              FastAPI: matched
            </motion.span>
          </div>

          {/* Bullet 2 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 font-mono text-[10px] text-muted-foreground/50">02</span>
              <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-muted-foreground">
                Architected high-availability data models in{" "}
                <motion.span
                  initial={false}
                  animate={
                    lineActive[2]
                      ? {
                          scale: [1, 1.08, 1],
                          backgroundColor: "rgba(16, 185, 129, 0.16)",
                          borderColor: "rgba(52, 211, 153, 0.4)",
                          color: "#34d399",
                        }
                      : {
                          scale: 1,
                          backgroundColor: "transparent",
                          borderColor: "transparent",
                          color: "var(--muted-foreground)",
                        }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="inline-block rounded-[4px] px-2 py-0.5 font-medium border"
                >
                  PostgreSQL
                </motion.span>
                {" "}with automated read replicas.
              </p>
            </div>
            <motion.span
              initial={false}
              animate={{
                opacity: lineActive[2] ? 1 : 0,
                scale: lineActive[2] ? [0.85, 1.04, 1] : 0.85,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="shrink-0 rounded-full border border-hairline-strong bg-field px-2.5 py-0.5 text-[11px] font-medium text-foreground whitespace-nowrap"
            >
              Postgres: matched
            </motion.span>
          </div>

          {/* Bullet 3 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 font-mono text-[10px] text-muted-foreground/50">03</span>
              <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-muted-foreground">
                Automated continuous deployments using{" "}
                <motion.span
                  initial={false}
                  animate={
                    lineActive[3]
                      ? {
                          scale: [1, 1.08, 1],
                          backgroundColor: "rgba(16, 185, 129, 0.16)",
                          borderColor: "rgba(52, 211, 153, 0.4)",
                          color: "#34d399",
                        }
                      : {
                          scale: 1,
                          backgroundColor: "transparent",
                          borderColor: "transparent",
                          color: "var(--muted-foreground)",
                        }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="inline-block rounded-[4px] px-2 py-0.5 font-medium border"
                >
                  Docker on AWS
                </motion.span>
                {" "}ECS clusters.
              </p>
            </div>
            <motion.span
              initial={false}
              animate={{
                opacity: lineActive[3] ? 1 : 0,
                scale: lineActive[3] ? [0.85, 1.04, 1] : 0.85,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="shrink-0 rounded-full border border-hairline-strong bg-field px-2.5 py-0.5 text-[11px] font-medium text-foreground whitespace-nowrap"
            >
              Docker/AWS: matched
            </motion.span>
          </div>
        </div>
      </div>

      {/* Bottom Match Score Panel */}
      <div className="border-t border-hairline pt-4">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
              Resume Compatibility Score
            </span>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              3 of 3 mandatory requirements verified with line receipts.
            </p>
          </div>
          <span className="tabular text-h4 font-[650] text-foreground">
            <motion.span>{scoreRounded}</motion.span>
            <span className="text-[13px] font-normal text-muted-foreground"> / 100</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-hairline">
          <motion.div
            className="h-full origin-left bg-foreground"
            initial={{ scaleX: reduce ? 0.92 : 0 }}
            animate={{ scaleX: isScored ? 0.92 : 0 }}
            transition={{ duration: reduce ? 0 : isScored ? 1.3 : 0.4, ease: EASE }}
          />
        </div>
      </div>
    </div>
  );
}

const candidates = [
  { id: "A. Rao", s: 86 },
  { id: "M. Iyer", s: 78 },
  { id: "S. Khan", s: 72 },
  { id: "R. Das", s: 64 },
  { id: "P. Nair", s: 55 },
  { id: "K. Bose", s: 47 },
];

function ScreenMock({ start = true }: { start?: boolean }) {
  const reduce = useReducedMotion();
  const [th, setTh] = useState(reduce ? 70 : 40);
  const [isScanning, setIsScanning] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(
    reduce ? [true, true, true, true, true, true] : [false, false, false, false, false, false]
  );
  const [showDivider, setShowDivider] = useState(reduce);

  useEffect(() => {
    if (reduce) {
      setTh(70);
      setRevealed([true, true, true, true, true, true]);
      setShowDivider(true);
      return;
    }

    if (!start) {
      setTh(40);
      setIsScanning(false);
      setRevealed([false, false, false, false, false, false]);
      setShowDivider(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      // 0: Reset to neutral uncolored state
      setTh(40);
      setIsScanning(false);
      setRevealed([false, false, false, false, false, false]);
      setShowDivider(false);

      // 1: Scan begins, threshold knob glides to 70
      timers.push(
        setTimeout(() => {
          setTh(70);
          setIsScanning(true);
        }, 700)
      );

      // 2: Sequential reveal as laser scan sweeps top to bottom
      timers.push(
        setTimeout(() => {
          setRevealed((prev) => {
            const next = [...prev];
            next[0] = true;
            return next;
          });
        }, 950)
      );

      timers.push(
        setTimeout(() => {
          setRevealed((prev) => {
            const next = [...prev];
            next[1] = true;
            return next;
          });
        }, 1200)
      );

      timers.push(
        setTimeout(() => {
          setRevealed((prev) => {
            const next = [...prev];
            next[2] = true;
            return next;
          });
        }, 1450)
      );

      // Below threshold divider expands
      timers.push(
        setTimeout(() => {
          setShowDivider(true);
        }, 1650)
      );

      timers.push(
        setTimeout(() => {
          setRevealed((prev) => {
            const next = [...prev];
            next[3] = true;
            return next;
          });
        }, 1850)
      );

      timers.push(
        setTimeout(() => {
          setRevealed((prev) => {
            const next = [...prev];
            next[4] = true;
            return next;
          });
        }, 2100)
      );

      timers.push(
        setTimeout(() => {
          setRevealed((prev) => {
            const next = [...prev];
            next[5] = true;
            return next;
          });
        }, 2350)
      );

      // End scan beam
      timers.push(
        setTimeout(() => {
          setIsScanning(false);
        }, 2650)
      );

      // Hold complete state, then loop at 8000ms
      timers.push(setTimeout(runCycle, 8000));
    };

    runCycle();

    return () => timers.forEach(clearTimeout);
  }, [start, reduce]);

  return (
    <div className="flex h-full flex-col justify-center gap-5 p-6 md:p-10 text-left select-none">
      {/* Minimal Threshold Bar */}
      <div>
        <div className="mb-3 flex justify-between text-[12px] text-muted-foreground">
          <span className="font-semibold">Threshold</span>
          <span className="tabular">{th}</span>
        </div>
        <div className="relative h-[3px] rounded-full bg-hairline">
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ x: `${th}%` }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            <span className="absolute -left-2 -top-[7px] h-4 w-4 rounded-full bg-foreground" />
          </motion.div>
        </div>
      </div>

      {/* Candidate List with Top-to-Bottom Scan Effect */}
      <div className="relative">
        {/* Laser Scan Beam */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-x-2 top-0 z-10 h-10 origin-top"
            initial={{ y: "0%", opacity: 0 }}
            animate={
              isScanning
                ? { y: ["0%", "520%"], opacity: [0, 1, 1, 0] }
                : { y: "0%", opacity: 0 }
            }
            transition={
              isScanning
                ? { duration: 1.85, ease: "easeInOut" }
                : { duration: 0 }
            }
          >
            <div className="h-full w-full bg-gradient-to-t from-foreground/12 to-transparent" />
            <div className="relative h-px w-full bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              <span className="absolute left-1 -top-[2px] h-[5px] w-[5px] rounded-full bg-foreground" />
              <span className="absolute right-1 -top-[2px] h-[5px] w-[5px] rounded-full bg-foreground" />
            </div>
          </motion.div>
        )}

        <ul className="space-y-1.5">
          {candidates.map((c, i) => {
            const isAbove = c.s >= 70;
            const isRevealed = revealed[i];

            return (
              <div key={c.id}>
                {i === 3 && (
                  <motion.li
                    initial={false}
                    animate={
                      showDivider
                        ? { height: "auto", opacity: 1, marginTop: 4, marginBottom: 4 }
                        : { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }
                    }
                    transition={{ duration: 0.35, ease: EASE }}
                    className="overflow-hidden flex items-center gap-3 py-1 text-[12px] text-muted-foreground list-none"
                  >
                    <span className="h-px flex-1 bg-hairline-strong" />
                    Below threshold
                    <span className="h-px flex-1 bg-hairline-strong" />
                  </motion.li>
                )}

                <li
                  className={`flex items-center justify-between rounded-tile border px-4 py-2 text-[14px] transition-colors duration-400 ${
                    !isRevealed
                      ? "border-hairline bg-field/50 text-foreground/90 font-normal"
                      : isAbove
                      ? "border-emerald-500/25 bg-emerald-500/[0.04] text-foreground font-medium"
                      : "border-rose-500/15 bg-rose-500/[0.03] text-muted-foreground font-normal"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-400 ${
                        !isRevealed
                          ? "bg-muted-foreground/35"
                          : isAbove
                          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                          : "bg-rose-400/80 shadow-[0_0_6px_rgba(251,113,133,0.3)]"
                      }`}
                    />
                    <span className={isRevealed && isAbove ? "text-foreground font-medium" : ""}>
                      {c.id}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] tabular transition-all duration-400 ${
                      !isRevealed
                        ? "border-hairline bg-field font-medium text-muted-foreground"
                        : isAbove
                        ? "border-emerald-500/25 bg-emerald-500/10 font-semibold text-emerald-400"
                        : "border-rose-500/20 bg-rose-500/10 font-semibold text-rose-400/80"
                    }`}
                  >
                    {c.s}
                  </span>
                </li>
              </div>
            );
          })}
        </ul>
      </div>

      {/* Recruiter Override Note */}
      <motion.div
        initial={false}
        animate={{ opacity: revealed[5] ? 1 : 0.5 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="rounded-tile border border-hairline px-4 py-2.5 text-[13px] text-muted-foreground"
      >
        Override recorded by recruiter · reason required
      </motion.div>
    </div>
  );
}

const languages = [
  {
    id: "en",
    label: "English",
    segments: [
      { text: "How did you optimize " },
      { text: "PostgreSQL", highlight: true },
      { text: " in your " },
      { text: "FastAPI", highlight: true },
      { text: " project?" },
    ],
  },
  {
    id: "hi",
    label: "हिन्दी",
    segments: [
      { text: "आपने अपने " },
      { text: "FastAPI", highlight: true },
      { text: " प्रोजेक्ट में " },
      { text: "PostgreSQL", highlight: true },
      { text: " को कैसे ऑप्टिमाइज़ किया?" },
    ],
  },
  {
    id: "cm",
    label: "Code-mixed",
    segments: [
      { text: "Aapne " },
      { text: "FastAPI", highlight: true },
      { text: " project mein " },
      { text: "Postgres", highlight: true },
      { text: " ko kaise optimize kiya?" },
    ],
  },
] as const;

function renderTypedSegments(
  segments: (typeof languages)[number]["segments"],
  typedCount: number
) {
  let remaining = typedCount;
  return segments.map((seg, idx) => {
    if (remaining <= 0) return null;
    const len = seg.text.length;
    const count = Math.min(len, remaining);
    const visibleText = seg.text.slice(0, count);
    remaining -= count;

    if ("highlight" in seg && seg.highlight) {
      return (
        <span
          key={idx}
          className="mx-1 inline-block rounded-[3px] bg-[#FACC15] px-1.5 py-0.5 text-[15px] sm:text-[17px] font-medium text-[#0a0a0a]"
        >
          {visibleText}
        </span>
      );
    }
    return <span key={idx}>{visibleText}</span>;
  });
}

function InterviewMock({ start = true }: { start?: boolean }) {
  const reduce = useReducedMotion();
  const [activeLang, setActiveLang] = useState(0);
  const [typedLength, setTypedLength] = useState(0);

  const currentLanguage = languages[activeLang] ?? languages[0];
  const currentSegments = currentLanguage.segments;
  const totalChars = useMemo(
    () => currentSegments.reduce((sum, s) => sum + s.text.length, 0),
    [currentSegments]
  );

  useEffect(() => {
    if (reduce) {
      setTypedLength(totalChars);
      return;
    }

    if (!start) {
      setTypedLength(0);
      setActiveLang(0);
      return;
    }

    setTypedLength(0);
    let current = 0;
    let pauseTimeout: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      current += 1;
      setTypedLength(current);

      if (current >= totalChars) {
        clearInterval(interval);
        pauseTimeout = setTimeout(() => {
          setActiveLang((prev) => (prev + 1) % languages.length);
        }, 3400);
      }
    }, 42);

    return () => {
      clearInterval(interval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, [activeLang, totalChars, reduce, start]);

  const waveformBars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const dist = Math.abs(i - 16.5) / 16.5;
        const env = Math.max(0.2, 1 - dist * 0.7);
        return [
          Math.max(0.18, env * 0.32),
          Math.max(0.28, env * 0.96),
          Math.max(0.22, env * 0.62),
        ] as [number, number, number];
      }),
    []
  );

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-hairline px-6 py-3 text-[10.5px] font-mono tracking-wider text-muted-foreground">
        <span>INTERVIEW / ILLUSTRATIVE</span>
        <span className="flex items-center gap-2">
          <span>{start ? "TRANSCRIPT ACTIVE" : "AWAITING START"}</span>
          <span className="relative flex h-2 w-2 items-center justify-center">
            {start && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FACC15] opacity-50" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                start ? "bg-[#FACC15]" : "bg-muted-foreground/40"
              }`}
            />
          </span>
        </span>
      </div>

      {/* Camera Viewfinder & Waveform */}
      <div className="flex flex-1 flex-col items-center justify-center border-b border-hairline px-6 py-4">
        {/* Camera frame */}
        <div className="relative flex h-28 w-48 flex-col items-center justify-center">
          <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-muted-foreground/45" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-muted-foreground/45" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-muted-foreground/45" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-muted-foreground/45" />

          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full border border-muted-foreground/50" />
            <div className="h-5 w-20 rounded-t-full border-t border-muted-foreground/50" />
          </div>

          <span className="mt-3 font-mono text-[8.5px] tracking-widest text-muted-foreground/60 uppercase">
            CAMERA PLACEHOLDER / NO RECORDING
          </span>
        </div>

        {/* Audio Waveform */}
        <div className="mt-4 flex h-7 items-center justify-center gap-[3px]" aria-hidden>
          {waveformBars.map((b, i) =>
            reduce ? (
              <span
                key={i}
                className="w-[2.5px] rounded-full bg-[#FACC15]"
                style={{ height: "26px", transform: `scaleY(${b[1]})` }}
              />
            ) : (
              <motion.span
                key={i}
                className="w-[2.5px] origin-center rounded-full bg-[#FACC15]"
                style={{ height: "26px" }}
                animate={start ? { scaleY: [b[0], b[1], b[2], b[0]] } : { scaleY: 0.2 }}
                transition={{
                  duration: 0.85 + (i % 6) * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i % 5) * 0.07,
                }}
              />
            )
          )}
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="flex items-center gap-6 border-b border-hairline px-6 py-2.5">
        {languages.map((l, i) => {
          const isSel = activeLang === i;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setActiveLang(i);
                setTypedLength(0);
              }}
              className={`relative py-1 text-[13px] transition-colors cursor-pointer ${
                isSel ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{l.label}</span>
              {isSel && (
                <motion.span
                  layoutId="active-lang-underline"
                  className="absolute -bottom-[11px] left-0 right-0 h-[2px] bg-[#FACC15]"
                  transition={{ duration: 0.35, ease: EASE }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Live Caption & Typewriter */}
      <div className="flex min-h-[110px] flex-col justify-center px-6 py-4">
        <div className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground/70 uppercase">
          LIVE CAPTION / ILLUSTRATIVE
        </div>
        <p className="min-h-[48px] text-[17px] sm:text-[19px] font-normal leading-snug tracking-tight text-foreground">
          {renderTypedSegments(currentSegments, reduce ? 999 : typedLength)}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
            className="ml-0.5 inline-block font-light text-[#FACC15] select-none"
          >
            |
          </motion.span>
        </p>
      </div>
    </div>
  );
}

const mocks = [MatchMock, ScreenMock, InterviewMock] as const;

function MobileStepCard({ step, index }: { step: (typeof steps)[number]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { amount: 0.25 });
  const M = mocks[index] ?? MatchMock;

  return (
    <Reveal>
      <h3 className="text-h3">
        <span className="mr-3 text-muted-foreground">{step.n}</span>
        {step.title}
      </h3>
      <p className="mt-3 text-muted-foreground">{step.body}</p>
      <div ref={cardRef} className="mt-6 overflow-hidden rounded-card border border-hairline bg-surface">
        <M start={isInView} />
      </div>
    </Reveal>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // In-view check: only start playing animations when user scrolls to this section
  const isSectionInView = useInView(sectionRef, { amount: 0.15 });

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(2, Math.floor(v * 3))));
  const Mock = mocks[active] ?? MatchMock;

  return (
    <section ref={sectionRef} id="how" aria-labelledby="how-h" className="pt-[120px]">
      <Reveal className="container-x">
        <h2 id="how-h" className="text-h2 max-w-[700px]">Three stages. One audit trail.</h2>
      </Reveal>

      {/* Desktop pinned */}
      <div ref={ref} className="relative hidden h-[300vh] min-[900px]:block">
        <div className="sticky top-0 flex h-screen items-center">
          <div className="container-x grid grid-cols-[1fr_1.1fr] gap-16">
            <div className="flex gap-8">
              <div className="relative w-px bg-hairline">
                <motion.div className="absolute inset-0 origin-top bg-foreground" style={{ scaleY: scrollYProgress }} />
              </div>
              <div className="flex flex-col justify-center gap-10 lg:gap-12 py-2">
                {steps.map((s, i) => (
                  <div
                    key={s.n}
                    className="cursor-pointer select-none transition-opacity"
                    onClick={() => {
                      if (!ref.current) return;
                      const rect = ref.current.getBoundingClientRect();
                      const scrollTop = window.scrollY || window.pageYOffset;
                      const top = rect.top + scrollTop;
                      const totalScroll = ref.current.offsetHeight - window.innerHeight;
                      const fraction = i === 0 ? 0.08 : i === 1 ? 0.5 : 0.92;
                      scrollToTarget(top + fraction * totalScroll, { duration: 1.0 });
                    }}
                  >
                    <motion.h3 className="text-h2" animate={{ opacity: active === i ? 1 : 0.25 }} transition={{ duration: 0.5, ease: EASE }}>
                      <span className="mr-4 text-h4 align-top text-muted-foreground">{s.n}</span>
                      {s.title}
                    </motion.h3>
                    <AnimatePresence mode="wait">
                      {active === i && (
                        <motion.p
                          key={s.n}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.5, ease: EASE }}
                          className="max-w-[440px] overflow-hidden pt-4 text-[17px] leading-relaxed text-muted-foreground"
                        >
                          {s.body}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative h-[520px] overflow-hidden rounded-card border border-hairline bg-surface">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="h-full"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <Mock start={isSectionInView} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile stacked */}
      <div className="container-x mt-12 space-y-16 min-[900px]:hidden">
        {steps.map((s, i) => (
          <MobileStepCard key={s.n} step={s} index={i} />
        ))}
      </div>
    </section>
  );
}

