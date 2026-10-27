# CLAUDE.md — HireSense

Read this file fully before writing or changing any code. It is the single source of context for the HireSense project: what the product is, what has and has not been built, the brand voice, the design system, the landing page spec, the motion spec, and the engineering rules.

If something here conflicts with `DESIGN.md`, `DESIGN.md` wins for design tokens and component geometry, and this file wins for everything else (product facts, copy, layout, motion, engineering).

---

## 1. Project at a glance

| Item | Value |
|---|---|
| Product name | **HireSense** (one word, capital H and S) |
| Domain | `hiresense.online` (to be purchased on Hostinger) |
| What it is | An end-to-end AI-assisted recruitment and interview platform that connects companies and applicants |
| Current deliverable | A **single-page marketing landing page**. The platform itself is **not built yet** |
| Current theme | **Dark** (a dark inversion of the monochrome system in `DESIGN.md`) |
| Tone | Calm, declarative, specific, professional. Editorial, award-site quality, never "AI startup template" |
| Audience for the landing page | Recruiters, HR leads, hiring managers, and (secondarily) job applicants |
| Primary conversion | Join the early access list (email capture, local state only for now) |

### One-sentence pitch
HireSense matches resumes to roles, runs multilingual AI interviews, and gives recruiters a report they can audit. People make every decision.

### What HireSense is NOT
- Not an autonomous hiring decision maker. The recruiter is always in the loop.
- Not a "black-box score" product. Every score must link to evidence.
- Not a personality or honesty detector. Proctoring reports observable events only.

---

## 2. Status and honesty rules (critical)

The platform has **not been implemented or benchmarked**. The project report states that its "preliminary results" are **proposed targets, not measured results**.

Therefore, on the landing page and anywhere public:

1. **Never invent** customer logos, testimonials, user counts, hiring statistics, accuracy figures, time-saved claims, or "trusted by" strips.
2. **Never present the sample report as real data.** The hero visual must be labelled "Sample report · illustrative". The candidate "Aarav M." and the score "82 / 100" are demo content.
3. **Never claim** a capability as shipped. Use "early access" language. Do not write "we have processed X resumes".
4. **Never claim** compliance, certifications, bias-audit results, or legal sign-offs.
5. **Never name third-party vendors** (e.g. Sarvam) on the marketing page. The report mentions Sarvam's Saaras (speech-to-text) and Bulbul (text-to-speech) for Indian-language speech, but those citations in the source report are unverified (they appear as raw citation placeholders). Treat vendor claims as unconfirmed until checked.
6. When in doubt, say less. A shorter, true sentence beats a bigger, unverifiable one.

---

## 3. Source-of-truth files

| File | Role |
|---|---|
| `CLAUDE.md` | This file. Project context, copy, layout, motion, rules |
| `DESIGN.md` | Original design system (a gallery-white monochrome system derived from an analysis of Mobbin). Source of truth for tokens, radii, type scale, component geometry, do's and don'ts |
| `AI_Recruitment_Platform_Project_Report1.docx` | Product and methodology report. Source of truth for product facts (sections 4 to 6 below summarize it) |
| `Project_Name` | Naming and domain notes: name is HireSense, domain `hiresense.online`, bought via Hostinger |

The light `DESIGN.md` tokens are retained for reference and for any future light theme or light surfaces (the footer uses them). The live landing page uses the dark mapping in section 8.

---

## 4. Product context (from the project report)

### 4.1 User roles
- **Company / Recruiter**: create company profile, publish jobs, define mandatory and preferred requirements, set screening thresholds, review candidate profiles, manually shortlist, schedule AI interviews, inspect reports.
- **Applicant**: create profile, upload resume, review extracted info, apply, give consent for AI processing, pick interview language, complete interview, view permitted feedback.
- **Platform administrator**: manage organizations, authentication, model/API configuration, audit logs, moderation, retention policies, system health.

### 4.2 End-to-end workflow (four stages)

**Stage 1. Job creation.** Recruiter enters title, department, location/work mode, experience, education, mandatory skills, preferred skills, responsibilities, job-specific questions. The system converts the job description into a structured **Job Requirement Profile**. Each requirement is typed: *mandatory, preferred, contextual, informational*. A screening threshold (e.g. 70/100) is a **workflow rule, not a claim that the score objectively measures candidate quality**.

**Stage 2. Resume submission and AI screening.** Candidate uploads PDF/DOCX. Parser extracts text and layout. PII is identified and protected. The matching model must **not** use protected characteristics or irrelevant personal attributes. The parser extracts education, skills, experience, projects, certifications, achievements, job history. Skill aliases are normalized (`JS` to `JavaScript`, `Postgres` to `PostgreSQL`). Resume and job profile are embedded in a shared semantic space. The scoring engine computes requirement-level evidence and an overall compatibility score. The report shows matched skills, missing skills, experience fit, education fit, project relevance, and **evidence snippets**.

**Stage 3. Screening.** Hard filters apply **only where the job genuinely requires them**. A configurable score threshold applies. Recruiter override and manual selection are allowed. **Every automated filter and every recruiter override is recorded with a reason** for auditability.

**Stage 4. AI interview.** Candidate grants camera/microphone permission and accepts an interview-processing notice. Candidate selects English, Hindi, or code-mixed mode. An interview planner builds the question set from job, resume, and projects. Questions mix introduction, resume verification, technical, situational, and role-specific. Candidate answers by voice/video. Speech-to-text transcribes (Indian multilingual speech including code-mixed). An LLM evaluates answers against a rubric and generates the next question. An optional vision module computes face-presence and gaze-direction signals and emits non-diagnostic proctoring events. The platform produces a structured interview report.

### 4.3 Resume matching methodology
- **Requirement extraction**: role, hard skills, soft skills, education, experience, responsibilities, domain knowledge, preferred qualifications. Each has a weight and a mandatory flag.
- **Resume extraction**: detect sections (Summary, Skills, Experience, Projects, Education, Certifications), extract entities, normalize skills, **preserve source spans** so every important score can be explained by resume evidence.
- **Hybrid scoring** (do not rely on a single cosine similarity). Prototype formula:

```
Match Score = 0.40 x weighted skill match
            + 0.20 x experience fit
            + 0.15 x project/role relevance
            + 0.10 x education/certification fit
            + 0.10 x responsibility semantic match
            + 0.05 x evidence quality
```

  Weights are configurable per job family and must be validated against human-reviewed examples. **Mandatory requirements are gates, not hidden penalties.**
- **Explanation**: matched / partially matched / missing-or-unclear, each with a resume section and text span. Do **not** infer a skill solely because two technologies are related.

### 4.4 AI interview methodology
- **Question types**: opening, resume verification, technical (from mandatory skills and seniority), scenario, behavioral, follow-up (when an answer is vague or claims an important skill).
- **State machine**: `INTRO -> RESUME -> TECHNICAL -> PROJECT -> SITUATIONAL -> FOLLOW-UP -> CLOSING`. The LLM supplies question wording and evaluation; the **application controls** allowed transitions, max duration, question count, and prohibited topics.
- **Multilingual**: English, Hindi, supported code-mixed mode, switchable mid-interview.
- **Interview scoring weights** (prototype, not validated): technical correctness 35%, problem solving/reasoning 20%, project understanding 15%, answer relevance/completeness 10%, communication structure/clarity 10%, role-specific behavioral evidence 10%.

### 4.5 Camera and gaze monitoring (responsible-AI rules)
- Face detection/landmarks estimate face presence and rough head/gaze direction. Store **event-level signals, not continuous video**, whenever possible.
- Events: face absent > N seconds (warning), repeated large deviation (soft warning), high cumulative off-camera duration (flag for human review), multiple faces (flag), camera disabled (pause/technical warning).
- **Never** interpret gaze as a psychological trait. Never output "dishonest" or "low confidence". Looking away can come from disability, assistive tech, reading, network issues, screen placement, culture, or normal thinking.
- **Accessibility accommodations must be supported.**

### 4.6 Scoring and report design
Separate four concepts and never let one number hide its reasons: **Eligibility** (mandatory passed/unclear), **Job compatibility** (0 to 100), **Interview evidence** (rubric components), **Confidence/uncertainty**, plus **Human review** (recruiter decision and notes).

Report sections: Overall Match, Requirement Matrix, Resume Strengths, Gaps, Project Relevance, Interview Summary, Technical Evidence, Communication Evidence, Proctoring Events, Questions to Verify, Model/Prompt Version, Audit Trail.

### 4.7 Data, preprocessing, evaluation (for future product work)
- **Prototype datasets**: Resume Entities for NER (DataTurks/Kaggle); Resume NER Training Dataset (Hugging Face, ~22.9k examples, verify license); Indian Job Market Dataset 2025 (Kaggle, 97k+ listings, CC BY-NC-SA 4.0, non-commercial); Data Science Job Market (Kaggle, 7k+, CC0); CareerCorpus (302 annotated resumes, small eval set). For the real system, build a consented, anonymized evaluation dataset.
- **Preprocessing**: file validation (MIME, size, malware scan), text extraction, OCR (deskew/denoise), normalization, PII handling, section segmentation, entity extraction, skill normalization, date normalization, deduplication, chunking, embedding, label creation.
- **Evaluation**: NER/skill F1, matching Precision/Recall/nDCG/pairwise accuracy, eligibility false-positive/negative rates, WER/CER per language (Hindi, English, code-mixed), interview-score agreement with blinded human raters, gaze precision/recall and false-positive rate under varied conditions, latency/cost per interview.
- **Review papers**: (1) *Learning to Match Jobs with Resumes from Sparse Interaction Data using Multi-View Co-Teaching Network* (Bian et al., arXiv 2009.13299). (2) *ConFit: Improving Resume-Job Matching using Data Augmentation and Contrastive Learning* (Yu, Zhang, Yu, RecSys 2024).

### 4.7a Compliance awareness (not legal advice)
Recruitment AI is regulated or scrutinized in several regions (for example, the EU AI Act treats employment-related AI as high-risk, and some US jurisdictions require bias audits for automated employment decision tools; India's data-protection law is relevant for consent and PII). Do not make compliance claims on the site. Flag to the founder that real deployment needs proper legal review.

---

## 5. Brand and voice

**Personality**: a careful, senior, slightly dry colleague who shows their work. Confident because it is specific, not because it is loud.

**Voice rules**
- Short, declarative sentences. Sentence case. Headlines end with a period.
- Specific over abstract: "Every score links back to the line in the resume" beats "Transparent AI".
- Emphasize **evidence, auditability, human decision**.
- No exclamation marks. No rhetorical hype.

**Banned words**: revolutionize, supercharge, unlock, game-changing, seamless, cutting-edge, next-gen, leverage (verb), empower, transform (as marketing verb), "AI-powered" as a standalone slogan, "10x", "effortless".

**Banned patterns**: fake stats, "trusted by" logo walls, stock handshake imagery, glowing orbs, purple/blue gradient blobs, emoji in UI, lorem ipsum, three-column icon-card feature grids.

**Wordmark**: "HireSense". Logomark: a squircle (30% radius) in `#f5f5f5` with a dark `H` (on dark theme). No icon beyond that.

---

## 6. Tech stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS (tokens as CSS variables, mapped in `tailwind.config`) |
| Animation | `framer-motion` (all component motion, scroll-linked values) |
| Smooth scroll | `lenis`, synced to framer-motion's frame loop |
| Fonts | Inter variable via Google Fonts (`wght 300..700`), standing in for the commercial Saans typeface |
| Icons | None by default. Use inline SVG for the few needed (chevron, plus/minus). No icon libraries |
| Imagery | **None.** No photos, no stock, no raster images. All visuals are CSS/SVG/HTML |
| Routing / backend / auth | **None.** Single page. Email form is local React state only, no network call |
| 3D / canvas / WebGL | **Not used.** No three.js |

### Suggested file structure
```
src/
  main.tsx
  App.tsx
  index.css                 # CSS variables, font-face, base styles, grain
  data/
    content.ts              # ALL copy lives here (section 10). No copy hard-coded in JSX
  lib/
    motion.ts               # EASE, durations, shared variants
    cn.ts                   # classnames helper
  hooks/
    useReducedMotionSafe.ts # wraps framer-motion's useReducedMotion
    useMagnetic.ts
    useTypewriter.ts
    useInterval.ts
    useCoarsePointer.ts
  components/
    layout/
      SmoothScroll.tsx      # Lenis provider
      ScrollProgress.tsx
      Cursor.tsx
      Grain.tsx
      Preloader.tsx
      Nav.tsx
      Footer.tsx
    ui/
      Button.tsx            # primary | outline | soft, magnetic option
      Badge.tsx
      Squircle.tsx
      TextInput.tsx
      MaskedText.tsx        # per-word / per-line mask reveal
      Reveal.tsx            # whileInView fade-up wrapper
    hero/
      DotGrid.tsx           # base + cursor-revealed grid
      HeroVisual.tsx        # the looping sequence (section 11)
      FloatingTiles.tsx
    mockups/
      MatchMockup.tsx
      ScreenMockup.tsx
      InterviewMockup.tsx
      Waveform.tsx
    sections/
      Hero.tsx
      Statement.tsx
      HowItWorks.tsx
      SkillsMarquee.tsx
      Principles.tsx
      Faq.tsx
      FinalCta.tsx
```

### Commands (once scaffolded)
```
npm install
npm run dev        # Vite dev server
npm run build      # type-check + production build
npm run preview    # preview production build
npm run lint
```

---

## 7. Page architecture

Single scroll, in this order:

1. Preloader (0.9s, overlay)
2. Nav (floating pill, sticky)
3. **Hero** (full viewport, animated visual)
4. **Statement** (scroll-scrubbed paragraph)
5. **How it works** (`#how`, pinned scroll story on desktop)
6. **Skills marquee** (two opposing rows)
7. **Principles** (`#principles`)
8. **FAQ** (`#faq`)
9. **Final CTA** (email capture)
10. **Footer** (inverted light band)

Global layers: scroll-progress line, custom cursor (fine pointer only), film grain overlay, Lenis smooth scroll.

---

## 8. Design system

### 8.1 Philosophy (carried over from DESIGN.md)
A **monochrome gallery system built to disappear**. Structure comes from a ladder of tints and 1px hairlines, never from shadows or color. Geometry carries the brand: **stadium pills** for every interactive element, **24px** cards, **16px** inputs and small tiles, **30% squircles** for icon tiles. Typography carries the voice: heavy headings, light lead text, tight leading, sentence case with terminal periods. **One accent blue, used almost never.**

### 8.2 Dark theme tokens (current)

The dark theme inverts the tint ladder: instead of white washed with ink, near-black lifted with white.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#0a0a0a` | Page background |
| `surface` | `#141414` | Cards, nav pill, FAQ rows, mockup frames (equivalent of `canvas-soft`) |
| `field` | `#1a1a1a` | Inputs, hover fills, highlight washes |
| `hairline` | `rgba(255,255,255,0.10)` | Resting 1px outlines |
| `hairline-strong` | `rgba(255,255,255,0.18)` | Outline buttons, connector paths, interactive edges |
| `text` | `#f5f5f5` | Headings, body, primary labels |
| `muted` | `#8a8a8a` | Secondary copy. About 5.7:1 on `#0a0a0a`, passes AA |
| `faint` | `#5c5c5c` | **Decorative or placeholder only.** About 3:1, **fails AA** for text. Never use for essential copy |
| `accent` | `#0066ff` | **Commercial/live signal only** (see 8.4) |
| `inverse` | `#f5f5f5` | Primary button fill, footer band |
| `on-inverse` | `#0a0a0a` | Text on inverse surfaces |
| `inverse-muted` | `#707070` | Secondary text on the light footer (about 4.5:1 on `#f5f5f5`; keep at 16px or larger) |

### 8.3 Light theme tokens (reference, from DESIGN.md)

| Token | Value |
|---|---|
| `primary` / `ink` | `#141414` |
| `ink-soft` | `#262626` |
| `text-muted` | `#707070` |
| `text-faint` | `#adadad` |
| `canvas` | `#ffffff` |
| `canvas-soft` | `#f3f3f3` |
| `field` / `hairline-soft` | `#f0f0f0` |
| `hairline` | `#e0e0e0` |
| `accent` | `#0066ff` |

### 8.4 Accent rules
- `#0066ff` appears **only** on: the hero "Early access" badge and the small live scan dot in the hero visual.
- **Never** on buttons, links, headings, borders, icons, or backgrounds.
- If you are tempted to add a second blue element, don't.

### 8.5 CSS variables and Tailwind mapping
```css
:root {
  --canvas: #0a0a0a;
  --surface: #141414;
  --field: #1a1a1a;
  --hairline: rgba(255, 255, 255, 0.10);
  --hairline-strong: rgba(255, 255, 255, 0.18);
  --text: #f5f5f5;
  --muted: #8a8a8a;
  --faint: #5c5c5c;
  --accent: #0066ff;
  --inverse: #f5f5f5;
  --on-inverse: #0a0a0a;
  --inverse-muted: #707070;

  --radius-pill: 9999px;
  --radius-card: 24px;
  --radius-input: 16px;
  --radius-squircle: 30%;
}
```
```ts
// tailwind.config.ts (extend)
colors: {
  canvas: 'var(--canvas)',
  surface: 'var(--surface)',
  field: 'var(--field)',
  hairline: 'var(--hairline)',
  'hairline-strong': 'var(--hairline-strong)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  faint: 'var(--faint)',
  accent: 'var(--accent)',
  inverse: 'var(--inverse)',
  'on-inverse': 'var(--on-inverse)',
  'inverse-muted': 'var(--inverse-muted)',
},
borderRadius: { pill: '9999px', card: '24px', input: '16px', squircle: '30%' },
maxWidth: { content: '1240px' },
fontFamily: { sans: ['Inter', '-apple-system', '"Helvetica Neue"', 'Arial', 'sans-serif'] },
```

### 8.6 Typography

Saans is commercial. Use **Inter variable** and map the unusual weights: **652 to 650**, **456 to 450**, **300 stays 300**, **600 stays 600**. Inter has a taller x-height than Saans, so tighten line-height by about 0.05 if text looks loose.

| Token | Size | Weight | Line-height | Use |
|---|---|---|---|---|
| `display` | `clamp(48px, 9vw, 120px)` | 650 | 0.95 | Hero headline, final CTA. `letter-spacing: -0.02em` allowed at display size only |
| `h2` | `clamp(36px, 5vw, 64px)` | 650 | 1.05 | Section headings, statement paragraph |
| `h3` | 32px | 650 | 1.13 | Card titles, principle titles, marquee chip names |
| `h4` | 24px | 650 | 1.25 | Sub-headings |
| `title` | 20px | 600 | 1.3 | Feature titles |
| `lead` | 20px | 300 | 1.38 | Hero subtitle, lead paragraphs |
| `body` | 16px | 450 | 1.45 | Default |
| `small` | 14px | 450 | 1.43 | Supporting copy |
| `link` / `button` | 16px | 600 | 1.38 | Nav links, buttons |
| `label` | 12px | 600 | 1.33 | Badges, pills |
| `caption` | 12px | 450 | 1.33 | Metadata |

Rules: letter-spacing **0** everywhere except display; **sentence case**, never all-caps; headlines end with a period; weight contrast (650 against 300) is the drama, not color. Use `font-variant-numeric: tabular-nums` on any counting number.

### 8.7 Geometry and spacing
- **Pill (9999px)**: every button, badge, nav, toggle, chip. No rectangular buttons exist.
- **Card 24px**: content cards, mockup frames, footer top corners.
- **16px**: inputs, small tiles, FAQ rows.
- **Squircle 30%**: skill tiles, logomark, floating hero tiles.
- Spacing base 8px (4px half-step). Tokens: 4, 8, 12, 16, 24, 32, 48, 80, 120.
- Sections 120px apart on desktop (80px on mobile). **No divider rules** between sections; whitespace groups.
- Card padding 24px. Content max-width **1240px**, centered, with 24px side padding on mobile.

### 8.8 Elevation
Flat. **No drop shadows. No glow. No neon. No glassmorphism. No gradients on UI.**
- Level 0: flat on `canvas`.
- Level 1: `surface` fill, no border (nav, FAQ rows).
- Level 2: `surface` fill + 1px `hairline` (cards, mockups).
- Inverse: `inverse` fill with `on-inverse` text (primary buttons, footer).

The **only** permitted gradient-like effect is the **radial mask** that reveals the bright dot grid under the cursor in the hero (a mask, not a visible gradient). Edge fades on the marquee use `mask-image`.

### 8.9 Components

**Primary button**: `inverse` fill, `on-inverse` text, pill, 48px tall, padding `0 24px`, weight 600. Magnetic (see 11.2). Hover scale 1.03, press 0.98.
**Outline button**: transparent, 1px `hairline-strong`, `text` color, pill, 48px.
**Soft button**: `surface` fill, no border, pill.
**Input**: `field` fill, no border, 16px radius, 12px/16px padding, placeholder in `faint`... use `muted` if contrast is a concern. Focus: **2px `#f5f5f5` ring** (ink-style focus). Keep the native cursor on inputs.
**Badge**: pill, 12px/600 label. The "Early access" badge is the one accent-filled badge.
**Nav pill**: floating, horizontally centered, detached from the top edge, `surface` with 1px `hairline`, sticky. Links get a `field` pill background on hover.
**Card / mockup frame**: `surface`, 1px `hairline`, 24px radius, 24px padding.
**FAQ row**: `surface`, 16px radius, 1px `hairline`, 12px gap between rows, plus/minus icon rotating 90 degrees.
**Squircle tile**: `surface` fill, 1px `hairline`, radius 30%, initials in 600.
**Status indicators** (monochrome): filled dot = matched; half-filled dot = partial; hollow ring = unclear.

### 8.10 Do and Don't (condensed from DESIGN.md)
**Do**: keep the canvas dark and neutral; let content and mockups supply interest; use pills for every interactive element; build emphasis with fill steps and hairlines; set headings at 650 with tight leading and a terminal period; pair heavy headings with light 300 leads; close with the inverted light footer.

**Don't**: add shadows; use the accent for CTAs; add extra accent hues, gradients, or colored bands; use purple; use letter-spacing or all-caps (except the allowed display tracking); add borders to inputs at rest; square off pills at small sizes; add icons to the Principles rows.

---

## 9. Section-by-section spec

### 9.0 Global experience layer
- **Lenis** smooth scroll (duration about 1.1), driven from framer-motion's frame loop.
- **Scroll progress**: 2px line fixed at the top, `#f5f5f5`, `scaleX` from `useScroll().scrollYProgress`, transform-origin left.
- **Custom cursor** (only when `(pointer: fine)`): 10px white dot, `mix-blend-mode: difference`, spring-follow; grows to 56px over links and buttons; hidden on touch; native cursor retained on inputs.
- **Magnetic buttons**: primary buttons shift up to 8px toward the pointer when within 80px, spring back on leave.
- **Film grain**: fixed full-viewport overlay, inline SVG `feTurbulence`, **4% opacity**, `pointer-events: none`.
- **Preloader**: 0.9s, full `#0a0a0a` screen, wordmark fades in, then the screen slides up (clip-path or translateY) to reveal the hero. **Hero animations start only after the preloader exits.**

### 9.1 Nav
Floating centered pill. Left: squircle logomark (`#f5f5f5` fill, dark `H`) plus "HireSense". Center links: "How it works", "Principles", "FAQ" (smooth-scroll anchors via Lenis). Right: primary pill "Request early access". Hides on scroll down, returns on scroll up. Mobile: logomark plus CTA only. Slides down 16px and fades in on load (after preloader).

### 9.2 Hero (full viewport, the showpiece)
**Background**: dot grid across the hero, 1px dots at 32px spacing, `rgba(255,255,255,0.10)`. A brighter copy (`rgba(255,255,255,0.45)`) is revealed **only inside a 220px radial mask following the cursor**, spring-smoothed. On touch devices the mask drifts slowly on its own along a Lissajous-style path.

**Content (centered)**:
1. Accent "Early access" pill badge.
2. Display headline: "Hire on evidence, not guesswork." Split into **words**, each inside an `overflow-hidden` mask, rising from 110% with a 60ms stagger. The word **"evidence"** gets a 2px underline that draws left to right after the reveal.
3. Lead (300, 20px, `muted`, max-width 600px).
4. Buttons: primary "Request early access", outline "See how it works" (scrolls to `#how`).
5. **Animated hero visual** (section 11).
6. Bottom center: "Scroll" caption with a 1px line animating downward.

**Floating tiles**: four squircles ("Py", "Re", "SQL", "Dk") around the visual's edges, independent slow floats (translateY +/-10px, 5 to 8s, infinite, alternate), plus subtle scroll parallax at different speeds. Hidden under 900px.

### 9.3 Statement (scroll-scrubbed)
One large paragraph at `h2` size, weight 650: "Most hiring tools give you a number. HireSense gives you the reasons behind it, line by line, so a person can check the work." Each word starts at **20% opacity** and goes to 100% as the section scrolls (`useScroll` plus per-word `useTransform`). Section about 150vh with a sticky inner container. Reduced motion: show all words at 100%.

### 9.4 How it works (`#how`)
Heading `h2`: "Three stages. One audit trail."

**Desktop (>=900px)**: a 300vh container with a sticky 100vh viewport.
- **Left column**: three large step labels ("01 Match.", "02 Screen.", "03 Interview."). Active label at full opacity, others at 25%. A vertical 1px progress line fills as you scroll. Under the active label, body text crossfades.
- **Right column**: a `surface` card (24px radius, hairline) whose content crossfades and slides between three mockups driven by scroll progress.

**Mobile (<900px)**: no pinning. Stack the steps vertically, each with its mockup, revealed with `whileInView`.

**Mockups** (all CSS/SVG/HTML):
- **Match**: a short resume paragraph; two phrases highlighted with a `field` wash that wipes in left to right; a connector line to a "FastAPI: matched" pill that pops in.
- **Screen**: threshold slider whose handle animates from 40 to 70 once in view; six candidate rows that reorder above/below the threshold line; a log row: "Override recorded by recruiter · reason required".
- **Interview**: segmented pill control (English / हिन्दी / Hinglish) with a sliding active pill (`layoutId`) that auto-cycles every 3s until hovered; a transcript that types out character by character (interviewer question, then candidate answer); a waveform of 28 bars with randomized heights.

### 9.5 Skills marquee
Full-bleed, **two rows in opposite directions**, linear, about 40s per loop. Chips: squircle tile with initials plus name at `h3` size; `muted` by default, brightening to `text` on hover. Marquee slows to 20% speed on hover. Edges faded with CSS `mask-image`.
- Row 1: Python, React, PostgreSQL, Docker, Kubernetes, FastAPI.
- Row 2: TypeScript, Node.js, Java, AWS, SQL, Redis.
- Caption above, muted: "Aliases are normalized, so “JS” reads as JavaScript and “Postgres” as PostgreSQL."

Implementation note: duplicate the row content once and animate `translateX` from 0 to -50% for a seamless loop.

### 9.6 Principles (`#principles`)
`h2`: "Built so a person can check the work." Four full-width rows separated by hairlines. Each row: small index ("01"), `h3`-size title, muted body (max-width 360px). **No icons.** On hover: row fills `surface`, title shifts 12px right, a 1px line draws under the title.

### 9.7 FAQ (`#faq`)
`h2`: "Questions, answered." Accordion rows (`surface`, 16px radius, hairline, 12px gap). Smooth height animation; plus icon rotates 90 degrees and becomes minus. Only one open at a time is fine; keyboard accessible (`button` with `aria-expanded`, `aria-controls`).

### 9.8 Final CTA
Centered display text "Hire with the receipts." with each line mask-revealed on scroll. Lead line below. Then a `field` email input plus primary magnetic pill "Join the list". **Local state only**: a valid email replaces the form with "Thanks. We’ll be in touch." No network call. Validate with a simple regex; show an inline error in `muted` text (not red, no new colors) such as "Enter a valid email address."

### 9.9 Footer (inverted light band)
Full-width `#f5f5f5` band, text `#0a0a0a`, top corners 24px radius. Giant "HireSense" wordmark fit to container (about 18vw); letters rise in a stagger on enter and nudge individually on hover (translateY -8px). Tagline "AI-assisted hiring with a human in the loop." in `#707070`. Two link columns: **Product** (How it works, Principles, FAQ) and **Company** (Contact, Privacy). Bottom row: "hiresense.online" and "© 2026 HireSense".

Note: Contact and Privacy are placeholders (`href="#"` or `mailto:` TBD). Do not create separate pages.

---

## 10. Copy deck (verbatim; keep in `src/data/content.ts`)

**Nav**: How it works / Principles / FAQ / Request early access

**Hero**
- Badge: `Early access`
- Headline: `Hire on evidence, not guesswork.`
- Lead: `HireSense matches resumes to roles, runs multilingual AI interviews, and gives recruiters a report they can audit. People make every decision.`
- Buttons: `Request early access` / `See how it works`
- Visual label: `Sample report · illustrative`
- Visual panes: `resume.pdf` and `Requirement matrix`
- Resume visible phrases: `Built REST services with FastAPI`, `Deployed with Docker on AWS`, `PostgreSQL schema design`, `Led a team of 4`
- Matrix rows: Python, FastAPI, PostgreSQL, Docker, Cloud deployment, Kubernetes
- Score: `82 / 100`, note `Mandatory requirements: all passed.`
- Kubernetes tag: `unclear`

**Statement**: `Most hiring tools give you a number. HireSense gives you the reasons behind it, line by line, so a person can check the work.`

**How it works**
- Heading: `Three stages. One audit trail.`
- 01 `Match.` `Resumes and job descriptions become structured requirements. Every score links back to the line in the resume that supports it.`
- 02 `Screen.` `Set the threshold your team uses. Hard filters apply only where a role truly requires them, and every filter or override is recorded with a reason.`
- 03 `Interview.` `Candidates choose English, Hindi, or code-mixed speech. Questions come from the role and the resume, and follow-ups probe vague answers.`
- Screen log row: `Override recorded by recruiter · reason required`
- Match pill: `FastAPI: matched`
- Language control: `English` / `हिन्दी` / `Hinglish`

**Skills caption**: `Aliases are normalized, so “JS” reads as JavaScript and “Postgres” as PostgreSQL.`

**Principles** (heading `Built so a person can check the work.`)
1. `Every score shows its evidence.` / `No black-box number. Each match links to resume text.`
2. `Requirements are gates, not hidden penalties.` / `Mandatory items pass, fail, or stay unclear, in plain view.`
3. `Proctoring reports events, not character.` / `Off-camera moments are flagged for review. They are never read as dishonesty, and accommodations are supported.`
4. `Recruiters decide.` / `The platform recommends and explains. Every override is logged.`

**FAQ** (heading `Questions, answered.`)
1. `Does HireSense reject candidates automatically?` / `Only by rules your team configures, and each rule is logged. Recruiters can override any outcome.`
2. `Which languages does the interview support?` / `English, Hindi, and code-mixed speech, with the option to switch mid-interview.`
3. `How is the match score calculated?` / `A weighted blend of skills, experience, project relevance, education, and responsibilities. Weights are configurable per job family.`
4. `What happens to camera data?` / `Event-level signals are stored in preference to continuous video, and candidates see a processing notice and give consent first.`
5. `Is it available now?` / `We’re in early access. Join the list and we’ll be in touch.`

**Final CTA**: Headline `Hire with the receipts.` Lead (write one calm line, e.g. `Join the early access list and see how a report you can audit feels.`). Button `Join the list`. Success: `Thanks. We’ll be in touch.`

**Footer**: tagline `AI-assisted hiring with a human in the loop.` Columns Product / Company as above. `hiresense.online` and `© 2026 HireSense`.

**Typography in copy**: use curly apostrophes and quotes (’ “ ”) in visible text; straight quotes only in code. Use the middle dot (·) as shown.

**Page title**: `HireSense — Hire on evidence, not guesswork.`

---

## 11. Hero visual: the looping sequence

The hero visual is a wide card (`surface`, 24px radius, hairline, max-width 1040px) with a window-style top bar: three hairline circles and the label "Sample report · illustrative". Inside, two columns:

- **Left, `resume.pdf`**: 9 skeleton text lines (muted bars of varied widths) with a few real phrases visible (see copy deck).
- **Right, `Requirement matrix`**: six rows with status indicators, plus the overall `82 / 100` readout and the mandatory-requirements note.

### State machine
Drive the whole sequence from **one phase state machine** (a single `useEffect` timeline or a `useAnimate` sequence). Do not scatter independent timers. Total loop about 9s, repeating.

| Phase | Time | What happens |
|---|---|---|
| `idle` | 0.0 to 0.8s | Resume lines fade in. Matrix rows empty: hollow rings, dimmed text |
| `scan` | 0.8 to 3.2s | A 1px white scan line with a small **blue live dot** sweeps top to bottom over the resume. Lines it passes brighten to full text color. Relevant phrases get a `field` highlight that wipes in left to right |
| `match` | 2.0 to 4.5s | Each highlighted phrase sends a small chip (the skill name) along a **curved SVG path** (1px `hairline-strong`, drawn with `stroke-dashoffset`) to its matrix row. On arrival: row text brightens, dot fills with a quick scale pop. **Cloud deployment** half-fills. **Kubernetes stays hollow** with a muted `unclear` tag |
| `score` | 4.5 to 6.0s | Score counts 0 to 82 with a tabular-nums roll. A thin progress bar/arc fills to 82% |
| `hold` | 6.0 to 8.2s | Hold. Gentle **4px parallax tilt** of the card following the pointer |
| `reset` | 8.2 to 9.0s | Everything fades back to the initial state; loop restarts |

Notes:
- Phases overlap by design (scan and match run concurrently).
- Only animate `transform` and `opacity` (plus `stroke-dashoffset` on SVG paths). Measure path start/end points from DOM refs with `getBoundingClientRect` relative to the card so paths line up at any size; recompute on resize.
- **Reduced motion**: render the final state (post-`score`) statically. No loop, no tilt.
- **Mobile**: stack the two columns vertically, keep the sequence, drop the tilt, reduce the number of connector paths if performance suffers.

---

## 12. Motion rules

- **Easing**: `[0.22, 1, 0.36, 1]` everywhere unless a spring is specified. Durations 0.6 to 0.9s for reveals.
- **Reveals**: all section headings and blocks reveal once via `whileInView` (24px rise plus fade, `viewport={{ once: true, amount: 0.2 }}`).
- **Things allowed to loop**: hero visual sequence, floating tiles, marquee, waveform, segmented-control autocycle. **Nothing else loops.**
- **Properties**: animate `transform` and `opacity` only. Use `will-change` sparingly and remove it after animation. Never animate layout properties (`width`, `height`, `top`, `left`) except the FAQ height, where `height: auto` animation via framer-motion is acceptable.
- **Performance**: target 60fps. Avoid animating large blurred or filtered layers. The grain overlay is static (do not animate it).
- **Reduced motion** (`prefers-reduced-motion: reduce`): no Lenis, no custom cursor, no loops, no scroll-scrub (show final states), no preloader, no magnetic effect. Use plain opacity fades only. Hero visual shows its final state.
- **Touch devices**: no custom cursor, no magnetic effect; the dot-grid reveal drifts automatically.
- Provide a single `EASE` constant and shared variants in `lib/motion.ts`; do not retype easing arrays.

---

## 13. Accessibility, responsiveness, performance

**Accessibility**
- Semantic landmarks: `<header>`/`<nav>`, `<main>`, `<section aria-labelledby>`, `<footer>`.
- One `<h1>` (the hero headline). Logical heading order below it.
- Visible focus rings on every interactive element (2px `#f5f5f5`, 2px offset on dark).
- Contrast: `text` and `muted` pass AA on `canvas` and `surface`. `faint` is decorative only.
- Decorative visuals (hero visual, mockups, floating tiles, grain, cursor) get `aria-hidden="true"`. Provide a visually hidden text summary of the hero sample report.
- FAQ: `button` with `aria-expanded` and `aria-controls`; panels are `region`s.
- The email input has a real `<label>` (visually hidden is fine).
- The pinned scroll story must remain keyboard and screen-reader readable (all three step texts present in the DOM, order preserved).
- Skip link to `#main`.

**Responsive**
- Designed down to **360px**, no horizontal scroll at any width.
- Breakpoints (from DESIGN.md, applied here): `xl 1280`, `lg 1024`, `md 840/768`, `sm 640`, `xs 600`. Pinning switches off under **900px**.
- Display and h2 use `clamp()`; minimum display about 48px on mobile.
- Nav collapses to logomark plus CTA on narrow screens.
- Touch targets at least 44px (buttons are 48px).
- Use `100svh`, not `100vh`, for full-viewport sections on mobile.

**Performance**
- No raster images; no layout shift; fonts loaded with `display=swap` and preconnect.
- Lazy-mount heavy mockups only when near viewport (`IntersectionObserver` or `whileInView`).
- Pause the hero loop and waveform when off-screen or when `document.hidden`.
- No console errors or warnings in production build.

---

## 14. Engineering conventions

- TypeScript strict mode. No `any`.
- Function components and hooks only. One component per file. Named exports for components, default export only for `App`.
- All copy in `data/content.ts`; components receive strings via imports or props, never inline marketing text.
- Styling with Tailwind utilities and the CSS variables above. No inline hex values in components (use tokens). No CSS-in-JS libraries.
- No new dependencies beyond: `react`, `react-dom`, `framer-motion`, `lenis`, `tailwindcss`, and their dev tooling. Ask before adding anything else.
- Keep components small and composable. Extract shared behavior into hooks (`useMagnetic`, `useTypewriter`, `useCoarsePointer`).
- Guard all `window`/`document` access (SSR-safe habits even though this is a SPA).
- Clean up every listener, interval, and timeout in effects.
- Prefer `useScroll`/`useTransform` over scroll event listeners.
- Comments explain *why*, not *what*. No dead code, no commented-out blocks, no TODO litter.
- Commit style (if using git): imperative, small, scoped (`feat(hero): add scan-line phase`).

---

## 15. Working agreements for AI assistants (Claude Code, Lovable, etc.)

1. **Build in one pass** and **do not add anything beyond the brief.** Credits are limited (the target is to finish a full build within roughly 5 credits on Lovable). No speculative features, no extra pages, no extra sections, no pricing section, no testimonials, no blog.
2. **Batch fixes.** When iterating, group all requested changes into a single pass rather than many tiny edits.
3. **If cost runs heavy**, cut in this order: the grain overlay, the second marquee row, the custom cursor, the scroll-scrubbed statement section. If the pinned How-it-works section misbehaves, make it non-pinned on all screen sizes and stack it with `whileInView` reveals.
4. **Do not invent content.** If copy is missing, write a calm, specific line consistent with section 5, or leave a clearly marked placeholder and tell the founder.
5. **Do not change the design tokens, radii, accent rules, or copy** without being asked. If something seems wrong, say so and propose a change instead of silently doing it.
6. **Match the brief, then stop.** After building, give a two-sentence summary of what was built and any assumptions.
7. **Never mention internal tooling** (credits, prompts, Lovable) in user-visible UI copy.

---

## 16. Definition of done (landing page)

- [ ] All ten sections present, in order, with the copy deck verbatim
- [ ] Dark theme tokens applied; footer inverted to the light band
- [ ] Accent blue appears only on the hero badge and the scan live dot
- [ ] No shadows, glows, gradients on UI, purple, emoji, images, or lorem ipsum
- [ ] Hero: dot grid with cursor reveal, word-mask headline with underline draw, looping hero visual with all six phases, floating tiles
- [ ] Preloader, scroll-progress line, custom cursor (fine pointer), magnetic buttons, grain, Lenis all working
- [ ] How it works pinned on desktop, stacked on mobile
- [ ] Marquee two rows, opposite directions, edge-faded, hover slow-down
- [ ] FAQ accessible and animated; email form works with local state only
- [ ] `prefers-reduced-motion` fully respected
- [ ] 360px to 1920px: no horizontal scroll
- [ ] No console errors; `npm run build` passes; 60fps on a mid-range laptop
- [ ] Page title set; one `<h1>`; landmarks present; focus rings visible; AA contrast

---

## 17. Open questions for the founder

These are intentionally unresolved. Do not guess; use placeholders and flag them.

1. **Contact email and Privacy page** content and destination (currently placeholders).
2. **Waitlist backend**: where early-access emails should be stored (Supabase, a form service, a Google Sheet, etc.). Currently local state only.
3. **Logo**: the squircle "H" logomark is a placeholder. A real mark may replace it.
4. **Analytics and cookie banner**: not included. Decide before launch if needed.
5. **Vendor claims**: verify the Saaras/Bulbul speech claims from the report before ever naming vendors publicly.
6. **Real product screenshots**: once the platform exists, replace illustrative mockups with real UI and, only after measurement, add real metrics.
7. **Pricing and plans**: deliberately omitted until defined.
8. **Legal review**: required before any public claims about fairness, bias, compliance, or data handling.

---

## 18. Decision log

- **Font**: Inter variable replaces Saans (commercial). Weight mapping 652 to 650 and 456 to 450.
- **Theme**: first prompt used the light DESIGN.md system; current direction is dark, with the tint ladder inverted and a **light footer** as a closing polarity flip.
- **Hero**: shows the product doing its job (scan, extract, match, score) rather than a generic orb, particle field, or gradient. This is what keeps the page specific and non-templated.
- **No pricing section**: plans are undefined.
- **No fake metrics**: the source report's results are targets, not measurements.
- **No third-party imagery**: keeps the page fast and fully on-system.
- **Accent restraint**: one blue badge and one live dot, so blue reads as a signal.