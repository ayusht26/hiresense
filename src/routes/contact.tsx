import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageShell } from "@/components/hs/PageShell";
import { EASE, Magnetic, Reveal, btnPrimary } from "@/components/hs/motion";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — HireSense" },
      {
        name: "description",
        content:
          "Contact the HireSense team for early access, enterprise pilots, or technical inquiries.",
      },
      { property: "og:title", content: "Contact Us — HireSense" },
      {
        property: "og:description",
        content: "Speak directly with the engineers building evidence-first hiring technology.",
      },
    ],
  }),
  component: ContactPage,
});

const inquiryTopics = [
  "Early Access Pilot",
  "Product Architecture",
  "Partnership & Enterprise",
  "Candidate Feedback",
  "General Inquiry",
];

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("Early Access Pilot");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please provide a valid email address.");
      return;
    }
    if (!message.trim()) {
      setError("Please include a brief message.");
      return;
    }

    // Success state
    setError("");
    setSubmitted(true);
  };

  return (
    <PageShell>
      <section className="container-x">
        <div className="max-w-[840px]">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-[13px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span>Direct Founder Access</span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="text-display mt-6 font-semibold">Get in touch.</h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="text-lead mt-6 text-muted-foreground">
              We read every message ourselves. Whether you are looking to pilot auditable screening,
              learn about our Indian multilingual speech stack, or ask a question, we are here.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_540px]">
          {/* Left Column: Direct channels */}
          <Reveal delay={0.24}>
            <div className="space-y-8">
              <div className="rounded-card border border-hairline bg-surface p-8">
                <span className="text-[13px] font-semibold text-muted-foreground">
                  Direct Email
                </span>
                <p className="mt-2 text-[20px] font-semibold text-foreground">
                  <a href="mailto:hello@hiresense.online" className="hover:underline">
                    hello@hiresense.online
                  </a>
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                  Direct inbox monitored by the founding engineers. You will receive a thoughtful
                  human reply within 24 business hours.
                </p>
              </div>

              <div className="space-y-6">
                <div className="border-t border-hairline pt-6">
                  <h3 className="text-[17px] font-semibold text-foreground">
                    Early Access Inquiries
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    Interested in evaluating our requirement extraction or running simulated
                    interviews for your open roles? Drop us your current role requirements.
                  </p>
                </div>

                <div className="border-t border-hairline pt-6">
                  <h3 className="text-[17px] font-semibold text-foreground">
                    Technical Discussion
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    Curious about our event-level proctoring signals, gaze metrics, or skill
                    normalization pipeline? We welcome in-depth technical inquiries.
                  </p>
                </div>

                <div className="border-t border-hairline pt-6">
                  <h3 className="text-[17px] font-semibold text-foreground">Location</h3>
                  <p className="mt-1.5 text-[14px] text-muted-foreground">
                    Delhi NCR, India · Available remotely across all timezones.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right Column: Contact Form */}
          <Reveal delay={0.32}>
            <div className="rounded-card border border-hairline bg-surface p-8 md:p-10">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="py-12 text-center"
                  >
                    <span className="squircle inline-flex h-14 w-14 items-center justify-center border border-hairline bg-field text-foreground">
                      <svg
                        className="h-6 w-6 stroke-current"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <h3 className="text-h3 mt-6 font-semibold">Message delivered.</h3>
                    <p className="mt-3 text-[15px] text-muted-foreground">
                      Thank you for reaching out, {name}. Our team has received your message and
                      will follow up at {email} shortly.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setMessage("");
                      }}
                      className="mt-8 rounded-full border border-hairline px-6 py-2.5 text-[14px] font-semibold text-foreground transition-colors hover:bg-field"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubmit} noValidate className="space-y-6">
                    <div>
                      <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
                        Send a message
                      </h2>
                      <p className="mt-1 text-[14px] text-muted-foreground">
                        Fill in your details below and we will get back to you directly.
                      </p>
                    </div>

                    {error && (
                      <div className="rounded-tile border border-destructive/30 bg-destructive/10 px-4 py-3 text-[14px] text-destructive-foreground">
                        {error}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-[13px] font-semibold text-muted-foreground"
                        >
                          Full Name *
                        </label>
                        <input
                          id="name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setError("");
                          }}
                          placeholder="Aarav Sharma"
                          className="mt-2 h-12 w-full rounded-tile bg-field px-4 text-foreground placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-[13px] font-semibold text-muted-foreground"
                        >
                          Email Address *
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                          }}
                          placeholder="aarav@company.com"
                          className="mt-2 h-12 w-full rounded-tile bg-field px-4 text-foreground placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="company"
                        className="block text-[13px] font-semibold text-muted-foreground"
                      >
                        Company or Team{" "}
                        <span className="text-[12px] font-normal text-faint">(Optional)</span>
                      </label>
                      <input
                        id="company"
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Acme Corp"
                        className="mt-2 h-12 w-full rounded-tile bg-field px-4 text-foreground placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-muted-foreground">
                        Topic of Interest
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {inquiryTopics.map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setTopic(t)}
                            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                              topic === t
                                ? "bg-inverse text-inverse-foreground"
                                : "border border-hairline bg-field text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-[13px] font-semibold text-muted-foreground"
                      >
                        Message *
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        required
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          setError("");
                        }}
                        placeholder="Tell us about your team's hiring workflow or what you'd like to explore..."
                        className="mt-2 w-full rounded-tile bg-field p-4 text-foreground placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>

                    <Magnetic>
                      <button type="submit" className={`${btnPrimary} w-full`}>
                        Send message
                      </button>
                    </Magnetic>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
