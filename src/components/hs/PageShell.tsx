import { ReactNode } from "react";
import { ReadyContext } from "@/components/hs/motion";
import { SmoothScroll, ScrollProgress, Cursor, Grain } from "@/components/hs/Experience";
import { Nav } from "@/components/hs/Nav";
import { Footer } from "@/components/hs/Closing";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <ReadyContext.Provider value={true}>
      <SmoothScroll />
      <ScrollProgress />
      <Cursor />
      <Grain />
      <Nav />
      <main className="min-h-screen pt-32 pb-24">{children}</main>
      <Footer />
    </ReadyContext.Provider>
  );
}
