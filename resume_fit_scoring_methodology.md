# HireSense Resume Fit Scoring Methodology

## 1. Overview & Philosophy

HireSense rejects black-box scoring. Every compatibility score is calculated using an evidence-backed hybrid evaluation model where all claims trace directly to verbatim text spans in the candidate's resume.

The score serves as a decision-support and interview-preparation guide for recruiters—not an automated hiring or rejection gate. People make every decision.

---

## 2. The Composite Fit Formula

The overall job compatibility score (0 to 100%) is calculated across six weighted dimensions:

$$\text{Match Score} = 0.40 \cdot S_{\text{skills}} + 0.20 \cdot S_{\text{exp}} + 0.15 \cdot S_{\text{proj}} + 0.10 \cdot S_{\text{edu}} + 0.10 \cdot S_{\text{resp}} + 0.05 \cdot S_{\text{evid}}$$

### Weight Distribution

| Component | Weight | Focus Area |
|---|---|---|
| **Weighted Skill Match** ($S_{\text{skills}}$) | **40%** | Technical and domain skill coverage against mandatory and preferred requirements. |
| **Experience Fit** ($S_{\text{exp}}$) | **20%** | Years of relevant industry experience and career seniority progression. |
| **Project & Role Relevance** ($S_{\text{proj}}$) | **15%** | Shipped products, system architecture, tools used, and demonstrable deliverables. |
| **Education & Certification Fit** ($S_{\text{edu}}$) | **10%** | Degree field, accredited coursework, and professional certifications. |
| **Responsibility Semantic Match** ($S_{\text{resp}}$) | **10%** | Alignment between past day-to-day duties and the target role responsibilities. |
| **Evidence Quality** ($S_{\text{evid}}$) | **5%** | Specificity, verifiable context, and descriptive detail versus superficial keyword stuffing. |

---

## 3. Dimension Breakdown

### A. Weighted Skill Match (40%)
* **Mandatory vs. Preferred Requirements**: Mandatory skills (e.g., React, TypeScript) carry primary weight. Preferred skills (e.g., Tailwind CSS, Supabase) provide secondary advantage.
* **Alias Normalization**: Variations and abbreviations are mapped to canonical forms before matching:
  * `JS`, `ES6` $\rightarrow$ `JavaScript`
  * `TS` $\rightarrow$ `TypeScript`
  * `Postgres` $\rightarrow$ `PostgreSQL`
  * `Tailwind` $\rightarrow$ `Tailwind CSS`
* **Evidence Attribution**: A skill is only counted as matched if accompanied by context in the resume text (e.g., within an experience bullet or project description), rather than assuming familiarity solely because related technologies are present.

### B. Experience Fit (20%)
* Evaluates career timeline, tenure, and trajectory against the expected seniority tier (e.g., Junior, Mid, Senior, Lead).
* Validates duration and continuity of relevant technical practice.

### C. Project & Role Relevance (15%)
* Evaluates hands-on execution and practical delivery.
* Examines whether the candidate designed, developed, or maintained real systems, architecture, or user-facing applications.

### D. Education & Certification Fit (10%)
* Evaluates relevant degrees (e.g., B.Tech, B.S., or Master's in Computer Science / Engineering) or accredited industry certifications directly applicable to the job profile.

### E. Responsibility Semantic Match (10%)
* Assesses semantic overlap between past job roles and the target job description (e.g., collaborating with cross-functional teams, managing APIs, maintaining high test coverage).

### F. Evidence Quality (5%)
* Rewards depth, concrete context, and descriptive outcomes.
* Penalizes keyword lists that lack supporting explanation of where and how the skills were applied.

---

## 4. Requirement Audit Matrix & Gap Analysis

Every requirement in the job profile is audited and mapped to one of three states:

* **Matched**: Direct, verifiable evidence found in the resume text with quotation references.
* **Partial**: Related skills or limited exposure identified, but depth or direct applicability is unclear.
* **Missing**: No direct mention or evidence identified in the candidate's profile.

### Gap Severity Classification
* **Critical**: Missing mandatory requirement; requires explicit verification during technical interviews.
* **Moderate**: Missing preferred requirement or partially demonstrated mandatory skill.
* **Minor**: Contextual or soft skill missing direct evidence.

---

## 5. Responsible AI & Governance Rules

1. **Mandatory Gates, Not Hidden Penalties**: Missing mandatory qualifications are highlighted as explicit Critical Gaps in the Requirement Matrix rather than being buried within an aggregated score.
2. **Exclusion of Protected Attributes**: The matching engine operates exclusively on skills, experience, and evidence. It never factors in race, gender, age, nationality, or irrelevant personal identifiable information (PII).
3. **No Hallucinated Equivalencies**: The engine does not presume competency in an unmentioned tool solely because the candidate knows an adjacent tool.
4. **Human in the Loop**: The compatibility percentage is a conversation roadmap and audit tool for hiring teams, accompanied by suggested verification questions for interviews. Final decisions remain strictly with human recruiters.
