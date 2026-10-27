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
    <div className="flex h-full flex-col justify-center gap-8">
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
    <div className="flex h-full flex-col justify-center gap-5">
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

const langs = ["English", "हिन्दी", "Hinglish"];
const q = "Interviewer: You mentioned async endpoints. How did you handle timeouts?";
const a = "Candidate: Har external call pe timeout set kiya, aur retries ko backoff ke saath limit kiya.";

function InterviewMock() {
  const reduce = useReducedMotion();
  const [li, setLi] = useState(2);
  const [n, setN] = useState(reduce ? q.length + a.length : 0);
  useEffect(() => {
    if (reduce) return;
    const c = setInterval(() => setLi((v) => (v + 1) % 3), 3000);
    const t = setInterval(() => setN((v) => (v >= q.length + a.length + 40 ? 0 : v + 1)), 35);
    return () => {
      clearInterval(c);
      clearInterval(t);
    };
  }, [reduce]);
  const bars = useMemo(() => Array.from({ length: 28 }, (): [number, number, number] => [0.2 + Math.random() * 0.8, 0.2 + Math.random() * 0.8, 0.2 + Math.random() * 0.8]), []);
  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="inline-flex w-fit rounded-full bg-field p-1" role="tablist" aria-label="Interview language">
        {langs.map((l, i) => (
          <span key={l} role="tab" aria-selected={li === i} className="relative rounded-full px-4 py-1.5 text-[14px] font-semibold">
            {li === i && (
              <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ duration: 0.5, ease: EASE }} />
            )}
            <span className={`relative ${li === i ? "text-primary-foreground" : "text-muted-foreground"}`}>{l}</span>
          </span>
        ))}
      </div>
      <div className="min-h-[120px] space-y-3 text-[15px]">
        <p className="text-muted-foreground">{q.slice(0, Math.min(n, q.length))}</p>
        <p>{n > q.length ? a.slice(0, n - q.length) : ""}</p>
      </div>
      <div className="flex h-12 items-center gap-[3px]" aria-hidden>
        {bars.map((b, i) =>
          reduce ? (
            <span
              key={i}
              className="h-full flex-1 origin-center rounded-full bg-foreground/70"
              style={{ transform: `scaleY(${b[0]})` }}
            />
          ) : (
            <motion.span
              key={i}
              className="h-full flex-1 origin-center rounded-full bg-foreground/70"
              initial={{ scaleY: b[0] }}
              animate={{ scaleY: [b[0], b[1], b[2], b[0]] }}
              transition={{ duration: 1.2 + (i % 5) * 0.15, repeat: Infinity, ease: "easeInOut" }}
            />
          )
        )}
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
            <div className="relative h-[520px] overflow-hidden rounded-card border border-hairline bg-surface p-10">
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
              <div className="mt-6 rounded-card border border-hairline bg-surface p-6">
                <M />
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
