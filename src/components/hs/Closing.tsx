import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
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

export function Footer() {
  const reduce = useReducedMotion();
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
        <div aria-label="HireSense" role="img" className="mt-16 flex select-none justify-between overflow-hidden text-[17.5vw] font-[650] leading-[0.85] tracking-[-0.04em] min-[1400px]:text-[230px]">
          {"HireSense".split("").map((c, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="inline-block"
              initial={{ y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              whileHover={reduce ? undefined : { y: -8 }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.04 }}
            >
              {c}
            </motion.span>
          ))}
        </div>
        <div className="mt-8 flex justify-between text-[14px] text-inverse-muted">
          <span>hiresense.online</span>
          <span>© 2026 HireSense</span>
        </div>
      </div>
    </footer>
  );
}
