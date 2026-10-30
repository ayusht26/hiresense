# HireSense

> AI-assisted recruitment and interview platform — marketing landing page.

## Stack

- **React 19** + **TanStack Start** + **TypeScript**
- **Tailwind CSS v4** (CSS variable tokens)
- **Framer Motion v14** — all component animation
- **Lenis** — smooth scroll, synced to framer frame loop
- **Vite 8**

## Dev

```bash
npm install
npm run dev       # → http://localhost:8080/
npm run build     # type-check + production build
npm run preview   # preview production build
npm run lint
```

## Context docs

| File | Purpose |
|---|---|
| `CLAUDE.md` / `GEMINI.md` | Full product, design, and engineering spec |
| `DESIGN.md` | Design system tokens (Mobbin analysis) |
| `AI_Recruitment_Platform_Project_Report1.docx` | Product methodology report |

## Structure

```
src/
  components/hs/    # All HireSense landing page sections
  routes/           # TanStack Router file-based routing
  lib/              # Utilities
  hooks/            # Custom hooks
  styles.css        # Tailwind v4 + CSS variable tokens
``
