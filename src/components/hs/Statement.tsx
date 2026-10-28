import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, useState } from "react";

const line1Words = ["Hiring", "is", "a", "human", "decision"];
const brandLetters = ["H", "i", "r", "e", "S", "e", "n", "s", "e"];
const line2RestWords = ["makes", "sure", "it’s", "an", "informed", "one."];

const totalWords = line1Words.length + 1 + line2RestWords.length;

function Word({
  w,
  i,
  n,
  p,
}: {
  w: string;
  i: number;
  n: number;
  p: MotionValue<number>;
}) {
  const start = i / n;
  const opacity = useTransform(p, [start, start + 1 / n], [0.2, 1]);
  return (
    <motion.span style={{ opacity }} className="inline">
      {w}{" "}
    </motion.span>
  );
}

function BrandWord({
  i,
  n,
  p,
  reduce,
}: {
  i: number;
  n: number;
  p: MotionValue<number>;
  reduce: boolean;
}) {
  const start = i / n;
  const scrollOpacity = useTransform(p, [start, start + 1 / n], [0.2, 1]);
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="group relative inline-block cursor-pointer select-none mr-[0.35em] align-baseline text-[1.12em] md:text-[1.15em] font-brand font-semibold tracking-[-0.02em]"
      data-hover="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Stadium pill backplate (absolute to prevent layout shift) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-4.5 -inset-y-2.5 -z-10 rounded-full border border-hairline-strong bg-surface transition-all duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "scale(1)" : "scale(0.96)",
        }}
      />

      {/* Letters with scroll-opacity and kinetic stagger lift on hover */}
      <motion.span
        style={{ opacity: reduce || hovered ? 1 : scrollOpacity }}
        className="relative inline-flex transition-opacity duration-200"
      >
        {brandLetters.map((char, idx) => (
          <motion.span
            key={idx}
            className="inline-block"
            animate={hovered && !reduce ? { y: -5 } : { y: 0 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 18,
              delay: idx * 0.02,
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.span>

      {/* Hairline underline drawing across */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 -bottom-1.5 h-[2px] origin-left bg-foreground transition-transform duration-300"
        style={{
          transform: hovered ? "scaleX(1)" : "scaleX(0)",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </span>
  );
}

export function Statement() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.6", "end end"] });

  return (
    <section ref={ref} aria-label="Statement" className={reduce ? "py-[120px]" : "relative h-[150vh]"}>
      <div className={reduce ? "" : "sticky top-0 flex h-screen items-center"}>
        <div className="container-x text-h2 max-w-[1100px]">
          {reduce ? (
            <>
              <p className="block">Hiring is a human decision</p>
              <p className="block mt-4 md:mt-6">
                <span className="text-[1.12em] md:text-[1.15em] font-brand font-semibold tracking-[-0.02em] mr-[0.35em]">
                  HireSense
                </span>
                makes sure it’s an informed one.
              </p>
            </>
          ) : (
            <>
              <p className="block">
                {line1Words.map((w, idx) => (
                  <Word
                    key={`l1-${idx}`}
                    w={w}
                    i={idx}
                    n={totalWords}
                    p={scrollYProgress}
                  />
                ))}
              </p>
              <p className="block mt-4 md:mt-6">
                <BrandWord
                  i={line1Words.length}
                  n={totalWords}
                  p={scrollYProgress}
                  reduce={reduce ?? false}
                />
                {line2RestWords.map((w, idx) => (
                  <Word
                    key={`l2-${idx}`}
                    w={w}
                    i={line1Words.length + 1 + idx}
                    n={totalWords}
                    p={scrollYProgress}
                  />
                ))}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
