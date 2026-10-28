import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { EASE, Reveal } from "./motion";

const faqs = [
  [
    "Does HireSense reject candidates automatically?",
    "Only by rules your team configures, and each rule is logged. Recruiters can override any outcome.",
  ],
  [
    "Which languages does the interview support?",
    "English, Hindi, and code-mixed speech, with the option to switch mid-interview.",
  ],
  [
    "How is the match score calculated?",
    "A weighted blend of skills, experience, project relevance, education, and responsibilities. Weights are configurable per job family.",
  ],
  [
    "What happens to camera data?",
    "Event-level signals are stored in preference to continuous video, and candidates see a processing notice and give consent first.",
  ],
  ["Is it available now?", "We’re in early access. Join the list and we’ll be in touch."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section
      id="faq"
      aria-labelledby="faq-h"
      className="container-x pt-20 md:pt-28 pb-20 md:pb-28 lg:pb-32"
    >
      <Reveal>
        <h2 id="faq-h" className="text-h2">
          Questions, answered.
        </h2>
      </Reveal>
      <div className="mt-12 flex max-w-[860px] flex-col gap-3">
        {faqs.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <Reveal
              key={q}
              delay={i * 0.04}
              className="rounded-tile border border-hairline bg-surface"
            >
              <h3>
                <button
                  className="flex w-full items-center justify-between gap-6 rounded-tile px-6 py-5 text-left text-[17px] font-semibold"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {q}
                  <span className="relative h-4 w-4 shrink-0" aria-hidden>
                    <span className="absolute left-0 top-1/2 h-px w-4 bg-foreground" />
                    <motion.span
                      className="absolute left-0 top-1/2 h-px w-4 bg-foreground"
                      animate={{ rotate: isOpen ? 0 : 90 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  </span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-muted-foreground">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
