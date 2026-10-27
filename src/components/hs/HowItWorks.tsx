import { AnimatePresence, LayoutGroup, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { EASE, Reveal } from "./motion";

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

function Hl({ children, delay }: { children: string; delay: number }) {
  return (
    <span className="relative inline-block px-0.5">
      <motion.span
        aria-hidden
        className="absolute inset-0 origin-left rounded-[4px] bg-field"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay }}
      />
      <span className="relative text-foreground">{children}</span>
    </span>
  );
}

function MatchMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-8 p-6 md:p-10">
      <div className="text-[12px] font-semibold text-muted-foreground">resume.pdf · experience</div>
      <p className="text-[17px] leading-relaxed text-muted-foreground">
        Designed and <Hl delay={0.3}>built REST services with FastAPI</Hl> for an internal billing platform, and{" "}
        <Hl delay={0.6}>wrote async endpoints in Python</Hl> serving the mobile team.
      </p>
      <div className="flex items-center gap-3">
        <motion.span
          className="h-px flex-1 origin-left bg-hairline-strong"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.9 }}
        />
        <motion.span
          className="rounded-full border border-hairline-strong px-4 py-1.5 text-[14px] font-semibold"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18, delay: 1.5 }}
        >
          FastAPI: matched
        </motion.span>
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

function ScreenMock() {
  const reduce = useReducedMotion();
  const [th, setTh] = useState(reduce ? 70 : 40);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setTh(70), 700);
    return () => clearTimeout(t);
  }, [reduce]);
  const above = candidates.filter((c) => c.s >= th);
  const below = candidates.filter((c) => c.s < th);
  return (
    <div className="flex h-full flex-col justify-center gap-5 p-6 md:p-10">
      <div>
        <div className="mb-3 flex justify-between text-[12px] text-muted-foreground">
          <span className="font-semibold">Threshold</span>
          <span className="tabular">{th}</span>
        </div>
        <div className="relative h-[3px] rounded-full bg-hairline">
          <motion.div className="absolute inset-0" initial={false} animate={{ x: `${th}%` }} transition={{ duration: 1.2, ease: EASE }}>
            <span className="absolute -left-2 -top-[7px] h-4 w-4 rounded-full bg-foreground" />
          </motion.div>
        </div>
      </div>
      <LayoutGroup>
        <ul className="space-y-1.5">
          {above.map((c) => (
            <motion.li
              layout
              key={c.id}
              transition={{ duration: 0.7, ease: EASE }}
              className="flex items-center justify-between rounded-tile border border-emerald-500/20 bg-field px-4 py-2 text-[14px]"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span className="text-foreground">{c.id}</span>
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[12px] font-semibold tabular text-emerald-400">
                {c.s}
              </span>
            </motion.li>
          ))}
          <motion.li layout key="line" transition={{ duration: 0.7, ease: EASE }} className="flex items-center gap-3 py-1 text-[12px] text-muted-foreground">
            <span className="h-px flex-1 bg-hairline-strong" />
            Below threshold
            <span className="h-px flex-1 bg-hairline-strong" />
          </motion.li>
          {below.map((c) => (
            <motion.li
              layout
              key={c.id}
              transition={{ duration: 0.7, ease: EASE }}
              className="flex items-center justify-between rounded-tile border border-rose-500/15 bg-rose-500/[0.03] px-4 py-2 text-[14px] text-muted-foreground"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/80 shadow-[0_0_6px_rgba(251,113,133,0.3)]" />
                <span>{c.id}</span>
              </div>
              <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[12px] font-semibold tabular text-rose-400/80">
                {c.s}
              </span>
            </motion.li>
          ))}
        </ul>
      </LayoutGroup>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 1.8 }}
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

function InterviewMock() {
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
  }, [activeLang, totalChars, reduce]);

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
          <span>TRANSCRIPT ACTIVE</span>
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FACC15] opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FACC15]" />
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
                animate={{ scaleY: [b[0], b[1], b[2], b[0]] }}
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

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(2, Math.floor(v * 3))));
  const Mock = mocks[active] ?? MatchMock;

  return (
    <section id="how" aria-labelledby="how-h" className="pt-[120px]">
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
                      window.scrollTo({ top: top + fraction * totalScroll, behavior: "smooth" });
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
                  <Mock />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile stacked */}
      <div className="container-x mt-12 space-y-16 min-[900px]:hidden">
        {steps.map((s, i) => {
          const M = mocks[i] ?? MatchMock;
          return (
            <Reveal key={s.n}>
              <h3 className="text-h3">
                <span className="mr-3 text-muted-foreground">{s.n}</span>
                {s.title}
              </h3>
              <p className="mt-3 text-muted-foreground">{s.body}</p>
              <div className="mt-6 overflow-hidden rounded-card border border-hairline bg-surface">
                <M />
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
