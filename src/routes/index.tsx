import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Cursor, Grain, Preloader, ScrollProgress, SmoothScroll } from "@/components/hs/Experience";
import { ReadyContext } from "@/components/hs/motion";
import { Nav } from "@/components/hs/Nav";
import { Hero } from "@/components/hs/Hero";
import { Statement } from "@/components/hs/Statement";
import { HowItWorks } from "@/components/hs/HowItWorks";
import { Faq } from "@/components/hs/Faq";
import { Footer } from "@/components/hs/Closing";
import { scrollToTarget } from "@/lib/scroll";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HireSense" },
      {
        name: "description",
        content:
          "HireSense matches resumes to roles, runs multilingual AI interviews, and gives recruiters a report they can audit.",
      },
      { property: "og:title", content: "HireSense — Hire on evidence, not guesswork." },
      { property: "og:description", content: "AI-assisted hiring with a human in the loop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [ready, setReady] = useState(false);
  const onDone = useCallback(() => setReady(true), []);
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    if (!ready) return;
    const targetHash = hash || (typeof window !== "undefined" ? window.location.hash : "");
    if (targetHash && targetHash.length > 1) {
      const formatted = targetHash.startsWith("#") ? targetHash : `#${targetHash}`;
      const t = setTimeout(() => {
        scrollToTarget(formatted, { duration: 1.2 });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [ready, hash]);

  return (
    <ReadyContext.Provider value={ready}>
      <SmoothScroll />
      <ScrollProgress />
      <Cursor />
      <Grain />
      <Preloader onDone={onDone} />
      <Nav />
      <main>
        <Hero />
        <Statement />
        <HowItWorks />
        <Faq />
      </main>
      <Footer />
    </ReadyContext.Provider>
  );
}
