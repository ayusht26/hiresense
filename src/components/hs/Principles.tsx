import { Reveal } from "./motion";

const items = [
  ["Every score shows its evidence.", "No black-box number. Each match links to resume text."],
  ["Requirements are gates, not hidden penalties.", "Mandatory items pass, fail, or stay unclear, in plain view."],
  [
    "Proctoring reports events, not character.",
    "Off-camera moments are flagged for review. They are never read as dishonesty, and accommodations are supported.",
  ],
  ["Recruiters decide.", "The platform recommends and explains. Every override is logged."],
];

export function Principles() {
  return (
    <section id="principles" aria-labelledby="pr-h" className="container-x pt-[120px]">
      <Reveal>
        <h2 id="pr-h" className="text-h2 max-w-[760px]">Built so a person can check the work.</h2>
      </Reveal>
      <ul className="mt-14 border-t border-hairline">
        {items.map(([t, b], i) => (
          <Reveal as="li" key={t} delay={i * 0.05} className="border-b border-hairline">
            <div className="group grid gap-4 rounded-card px-4 py-8 transition-colors duration-500 hover:bg-surface md:grid-cols-[80px_1fr_360px] md:items-baseline md:px-6">
              <span className="text-[14px] text-muted-foreground tabular">0{i + 1}</span>
              <h3 className="text-h4 md:text-h3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-3">
                <span className="relative">
                  {t}
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                </span>
              </h3>
              <p className="max-w-[360px] text-muted-foreground">{b}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
