import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/hs/PageShell";
import { Reveal, btnPrimary, btnOutline } from "@/components/hs/motion";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — HireSense" },
      {
        name: "description",
        content:
          "Meet the team building HireSense: an auditable, evidence-first recruitment and AI interview platform.",
      },
      { property: "og:title", content: "About Us — HireSense" },
      {
        property: "og:description",
        content: "Built by four engineers on a mission to bring proof and accountability to AI recruitment.",
      },
    ],
  }),
  component: AboutPage,
});

interface Founder {
  name: string;
  role: string;
  initials: string;
  bio: string;
  email: string;
  linkedin: string;
  github: string;
  leetcode?: string;
}

const founders: Founder[] = [
  {
    name: "Ayush Tiwari",
    role: "Co-founder · Engineering Lead",
    initials: "AT",
    bio: "Focuses on core architecture, semantic requirement extraction, and verifiable scoring pipelines where every number traces to resume source spans.",
    email: "ayusht26.codes@gmail.com",
    linkedin: "https://www.linkedin.com/in/ayush-t26/",
    github: "https://github.com/ayusht26",
    leetcode: "https://leetcode.com/u/ayushvai/",
  },
  {
    name: "Samanyu Khanna",
    role: "Co-founder · Systems Engineer",
    initials: "SK",
    bio: "Engineers deterministic workflow orchestration, strict gatekeeper validation, and audit logging to ensure hiring teams retain full control.",
    email: "samanyukhanna23@gmail.com",
    linkedin: "https://www.linkedin.com/in/samanyu-khanna-5b366733a/",
    github: "https://github.com/samanyu22",
  },
  {
    name: "Varnit Agustya",
    role: "Co-founder · Intelligence & Speech",
    initials: "VA",
    bio: "Develops multilingual interview evaluation models, speech transcription pipelines for Indian code-mixed speech, and rubric alignment.",
    email: "varnitagustya@gmail.com",
    linkedin: "https://www.linkedin.com/in/varnit-agustya-7a2660233",
    github: "https://github.com/VarnitAgustya27",
    leetcode: "https://leetcode.com/u/Varnit_Agustya/",
  },
  {
    name: "Yuvraj Pathania",
    role: "Co-founder · Platform & Infrastructure",
    initials: "YP",
    bio: "Specializes in secure PII segmentation, privacy-first proctoring telemetry, and high-performance infrastructure for live candidate sessions.",
    email: "yuvrajpathania836@gmail.com",
    linkedin: "https://www.linkedin.com/in/yuvraj-pathania-a40578249/",
    github: "https://github.com/YP836",
  },
];

function AboutPage() {
  return (
    <PageShell>
      {/* Hero statement */}
      <section className="container-x">
        <div className="max-w-[840px]">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-[13px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span>Founding Team</span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="text-display mt-6 font-semibold">
              Built so people can check the work.
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="text-lead mt-8 text-muted-foreground">
              HireSense was started by four engineers who saw recruitment software drifting toward
              opaque black boxes. We are building an architecture where semantic AI matches resumes to roles
              and transcribes multilingual interviews, while leaving accountability firmly in human hands.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Founders Grid */}
      <section className="container-x mt-28">
        <Reveal>
          <div className="border-t border-hairline pt-12">
            <h2 className="text-h2 font-semibold">The founders.</h2>
            <p className="mt-3 max-w-[640px] text-muted-foreground">
              Engineers united by a commitment to explainable machine intelligence, distributed reliability, and candidate respect.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {founders.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.08}>
              <div className="group flex h-full flex-col justify-between rounded-card border border-hairline bg-surface p-8 transition-all duration-300 hover:border-hairline-strong hover:bg-field/40">
                <div>
                  {/* Top: Avatar & Name */}
                  <div className="flex items-start gap-4">
                    <span className="squircle inline-flex h-14 w-14 shrink-0 items-center justify-center border border-hairline bg-field text-[18px] font-bold text-foreground">
                      {f.initials}
                    </span>
                    <div>
                      <h3 className="text-[22px] font-semibold tracking-tight text-foreground">{f.name}</h3>
                      <p className="mt-0.5 text-[14px] text-muted-foreground">{f.role}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
                    {f.bio}
                  </p>
                </div>

                {/* Bottom: Contact & Links */}
                <div className="mt-8 border-t border-hairline pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <a
                      href={`mailto:${f.email}`}
                      className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{f.email}</span>
                    </a>

                    <div className="flex items-center gap-2">
                      {/* LinkedIn */}
                      <a
                        href={f.linkedin}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`${f.name} on LinkedIn`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-field text-muted-foreground transition-colors hover:border-hairline-strong hover:text-foreground"
                      >
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                      </a>

                      {/* GitHub */}
                      <a
                        href={f.github}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`${f.name} on GitHub`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-field text-muted-foreground transition-colors hover:border-hairline-strong hover:text-foreground"
                      >
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </a>

                      {/* LeetCode if provided */}
                      {f.leetcode && (
                        <a
                          href={f.leetcode}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={`${f.name} on LeetCode`}
                          className="inline-flex h-8 items-center gap-1 rounded-full border border-hairline bg-field px-2.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-hairline-strong hover:text-foreground"
                        >
                          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                            <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 4.964 3.75 5.98 5.98 0 0 0 .977.014c.338-.01.67-.058.995-.145a6.046 6.046 0 0 0 1.905-.898l8.28-6.19a1.376 1.376 0 1 0-1.65-2.208l-8.28 6.19a3.3 3.3 0 0 1-1.041.49 3.25 3.25 0 0 1-.543.08 3.22 3.22 0 0 1-.533-.008 3.2 3.2 0 0 1-2.68-2.025 3.01 3.01 0 0 1-.188-.553 2.977 2.977 0 0 1-.034-1.272 2.87 2.87 0 0 1 .66-1.148l3.854-4.126 5.405-5.788A1.374 1.374 0 0 0 13.483 0z" />
                          </svg>
                          <span>LeetCode</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Engineering Blueprint Note */}
      <section className="container-x mt-28">
        <Reveal>
          <div className="rounded-card border border-hairline bg-surface p-8 md:p-12">
            <div className="max-w-[720px]">
              <span className="text-[13px] font-semibold text-muted-foreground">Engineering Outlook</span>
              <h2 className="text-h3 mt-2 font-semibold">Built in the open. Tested against real constraints.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
                We are currently running private evaluations with hiring partners across technical and customer-facing roles.
                If you are interested in running a pilot on our evidence-first screening workflow or testing Indian multilingual speech models, we would love to connect.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/contact" className={btnPrimary}>
                  Contact the team
                </Link>
                <a href="/#join" className={btnOutline}>
                  Request early access
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
