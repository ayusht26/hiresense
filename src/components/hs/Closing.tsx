import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EASE, Magnetic, Reveal, btnPrimary } from "./motion";

export function FinalCta() {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) setDone(true);
    else setErr("Enter a valid email address.");
  };
  return (
    <section id="join" aria-labelledby="cta-h" className="container-x flex flex-col items-center py-[160px] text-center">
      <h2 id="cta-h" className="text-display">
        {["Hire with", "the receipts."].map((l, i) => (
          <span key={l} className="block overflow-hidden pb-[0.08em]">
            <motion.span
              className="block"
              initial={{ y: reduce ? 0 : "110%", opacity: reduce ? 0 : 1 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.1 }}
            >
              {l}
            </motion.span>
          </span>
        ))}
      </h2>
      <Reveal delay={0.2}>
        <p className="text-lead mt-8 max-w-[520px] text-muted-foreground">
          Join the early access list. We’ll reach out when there’s a place for your team.
        </p>
      </Reveal>
      <div className="mt-10 min-h-[72px] w-full max-w-[520px]">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.p key="ok" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="text-h4">
              Thanks. We’ll be in touch.
            </motion.p>
          ) : (
            <motion.form key="f" exit={{ opacity: 0, y: -12 }} onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                aria-invalid={!!err}
                aria-describedby={err ? "email-err" : undefined}
                className="h-12 flex-1 rounded-tile bg-field px-5 text-foreground placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Magnetic>
                <button type="submit" className={`${btnPrimary} w-full sm:w-auto`}>Join the list</button>
              </Magnetic>
            </motion.form>
          )}
        </AnimatePresence>
        {err && !done && <p id="email-err" className="mt-3 text-left text-[14px] text-muted-foreground">{err}</p>}
      </div>
    </section>
  );
}

const LETTERS = ["H", "i", "r", "e", "S", "e", "n", "s", "e"] as const;

function FooterWordmark() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  // Spring values for interactive letter lift
  const y0 = useMotionValue(0);
  const y1 = useMotionValue(0);
  const y2 = useMotionValue(0);
  const y3 = useMotionValue(0);
  const y4 = useMotionValue(0);
  const y5 = useMotionValue(0);
  const y6 = useMotionValue(0);
  const y7 = useMotionValue(0);
  const y8 = useMotionValue(0);

  const raw = [y0, y1, y2, y3, y4, y5, y6, y7, y8];

  const springConfig = { stiffness: 260, damping: 20 };
  const s0 = useSpring(y0, springConfig);
  const s1 = useSpring(y1, springConfig);
  const s2 = useSpring(y2, springConfig);
  const s3 = useSpring(y3, springConfig);
  const s4 = useSpring(y4, springConfig);
  const s5 = useSpring(y5, springConfig);
  const s6 = useSpring(y6, springConfig);
  const s7 = useSpring(y7, springConfig);
  const s8 = useSpring(y8, springConfig);

  const springs = [s0, s1, s2, s3, s4, s5, s6, s7, s8];

  // Introductory wave ripple when entering view
  useEffect(() => {
    if (reduce || !isInView) return;
    const timer = setTimeout(() => {
      LETTERS.forEach((_, i) => {
        setTimeout(() => {
          raw[i].set(-20);
          setTimeout(() => raw[i].set(0), 180);
        }, i * 65);
      });
    }, 1100);
    return () => clearTimeout(timer);
  }, [isInView, reduce]);

  // Pointer move creates smooth proximity wave
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    letterRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const charCenterX = rect.left + rect.width / 2;
      const charCenterY = rect.top + rect.height / 2;
      const dist = Math.hypot(mouseX - charCenterX, (mouseY - charCenterY) * 1.3);
      const maxDist = 200;

      if (dist < maxDist) {
        const factor = Math.cos((dist / maxDist) * (Math.PI / 2));
        raw[i].set(-factor * 26);
      } else {
        raw[i].set(0);
      }
    });
  };

  const onPointerLeave = () => {
    raw.forEach((y) => y.set(0));
  };

  // Click shockwave rippling outwards
  const onLetterClick = (clickedIdx: number) => {
    if (reduce) return;
    LETTERS.forEach((_, i) => {
      const dist = Math.abs(clickedIdx - i);
      setTimeout(() => {
        raw[i].set(-26);
        setTimeout(() => raw[i].set(0), 180);
      }, dist * 50);
    });
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label="HireSense"
      role="img"
      className="mt-16 flex select-none justify-between overflow-visible text-[17.5vw] font-[650] leading-[0.85] tracking-[-0.04em] min-[1400px]:text-[230px]"
    >
      {LETTERS.map((c, i) => (
        <span
          key={i}
          className="relative inline-block cursor-pointer overflow-hidden pb-[0.06em] pt-6 -mt-6"
          onClick={() => onLetterClick(i)}
        >
          <motion.span
            className="inline-block"
            initial={{ y: reduce ? 0 : "115%", opacity: reduce ? 0 : 1 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.85,
              ease: [0.16, 1, 0.3, 1],
              delay: reduce ? 0 : i * 0.045,
            }}
          >
            <motion.span
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              style={{ y: springs[i] }}
              className="inline-block transition-transform duration-75 active:scale-95"
              aria-hidden
            >
              {c}
            </motion.span>
          </motion.span>
        </span>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="rounded-t-card bg-inverse text-inverse-foreground">
      <div className="container-x pb-8 pt-16">
        <div className="grid gap-10 md:grid-cols-[1fr_auto_auto] md:gap-20">
          <p className="max-w-[320px] text-inverse-muted">AI-assisted hiring with a human in the loop.</p>
          <nav aria-label="Product">
            <h3 className="mb-3 text-[14px] font-semibold">Product</h3>
            <ul className="space-y-2 text-inverse-muted">
              <li><a className="hover:text-inverse-foreground" href="#how">How it works</a></li>
              <li><a className="hover:text-inverse-foreground" href="#principles">Principles</a></li>
              <li><a className="hover:text-inverse-foreground" href="#faq">FAQ</a></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h3 className="mb-3 text-[14px] font-semibold">Company</h3>
            <ul className="space-y-2 text-inverse-muted">
              <li><a className="hover:text-inverse-foreground" href="mailto:hello@hiresense.online">Contact</a></li>
              <li><a className="hover:text-inverse-foreground" href="#top">Privacy</a></li>
            </ul>
          </nav>
        </div>
        <FooterWordmark />
        <div className="mt-8 flex justify-between text-[14px] text-inverse-muted">
          <span>hiresense.online</span>
          <span>© 2026 HireSense</span>
        </div>
      </div>
    </footer>
  );
}

