import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

const text =
  "Most hiring tools give you a number. HireSense gives you the reasons behind it, line by line, so a person can check the work.";

function Word({ w, i, n, p }: { w: string; i: number; n: number; p: MotionValue<number> }) {
  const start = i / n;
  const opacity = useTransform(p, [start, start + 1 / n], [0.2, 1]);
  return (
    <motion.span style={{ opacity }} className="inline">
      {w}{" "}
    </motion.span>
  );
}

export function Statement() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.6", "end end"] });
  const words = text.split(" ");
  return (
    <section ref={ref} aria-label="Statement" className={reduce ? "py-[120px]" : "relative h-[150vh]"}>
      <div className={reduce ? "" : "sticky top-0 flex h-screen items-center"}>
        <p className="container-x text-h2 max-w-[1100px]">
          {reduce
            ? text
            : words.map((w, i) => <Word key={i} w={w} i={i} n={words.length} p={scrollYProgress} />)}
        </p>
      </div>
    </section>
  );
}
