# User Preferences & Standards

This document preserves the user's architectural, design, and workflow preferences for **PerBlinkist**. The agent must strictly respect these guidelines at all times.

---

## 1. Architectural Philosophy & Principles
- **Self-Hosted, Media Server Philosophy**: PerBlinkist functions like an audiobook/summary counterpart to Jellyfin.
  - Media files are mounted via a directory/volume (e.g., Docker read-only mount `/media:ro`).
  - No manual web-based file uploads; automatic file scanner indexes and links audiobooks with their metadata.
  - Range-based HTTP 206 streaming for instantaneous byte seeking (zero memory buffering).
- **Framework & Backend**:
  - **Next.js (App Router, TypeScript, modern React)** with **tRPC** inside Next.js (`/api/trpc/[trpc]`) for full end-to-end type safety.
  - No bloated REST route duplication or RSC fragmentation for media APIs.
  - Native Next.js server utilities (e.g. `cookies()` from `next/headers`) used directly in server routines and tRPC procedures to set/delete cookies via native HTTP response headers.
- **Database & ORM**:
  - **Prisma** with **SQLite** (`config/perblinkist.db`).
  - WAL mode enabled, zero external database container required.
- **Package Manager**:
  - Strictly **`pnpm`** (never `npm` or `yarn`).

---

## 2. Visual Design & Aesthetics
- **Formal Shadcn Aesthetic**:
  - **Zinc / Black Monochromatic Theme**: Pure blacks (`zinc-950`), subtle dark grays (`zinc-900`, `zinc-800`), crisp white contrast buttons/text, muted neutral subtitles (`zinc-400`).
  - **Zero AI Gimmicks**: Strictly reject fluorescent green neons, flashy gaming gradients, and decorative AI sparkle icons. The app must feel formal, polished, professional, and literary.
- **Component System**:
  - Exclusively official **shadcn/ui** components (`components/ui/*`). Never invent custom ad-hoc button/card styles when an official shadcn component is available.
- **Authentication Presentation**:
  - **50/50 Desktop Split-Screen Archetype**:
    - **Left Half**: Elegant editorial photography with low opacity, PerBlinkist geometric monogram logo, and a literary quotation on reading.
    - **Right Half**: Focused, minimalist authentication forms (Sign In, Sign Up, and Security Question Recovery) built with shadcn primitives.

---

## 3. Account Security & Recovery
- **Zero-Friction, Non-Critical Recovery**:
  - For local/self-hosted instances, password recovery is powered by memorable **Security Questions** (e.g. first pet, birth city, childhood nickname, favorite book).
  - Answers are normalized (`trim().toLowerCase()`) and salted with bcrypt before storage to allow case-insensitive recovery while keeping answers secure in SQLite.
  - No external SMTP or email service dependency is required for password recovery.

---

## 4. Agent Operational Standards (Mandatory Procedure)
1. **Specs-First Development**:
   - Before writing or modifying code for any standalone feature or milestone, create a dedicated folder under `specs/<feature-name>/`.
   - Populate with three essential documents:
     - `requirements.md` (acceptance criteria, edge cases)
     - `plan.md` (architectural design, step-by-step implementation plan)
     - `validate.md` (verification checklist and test instructions)
2. **Frequent Commits**: Commit changes after every meaningful milestone or logical progress chunk.
3. **Push on Completion**: Always push to GitHub (`origin/main`) once a specification milestone is implemented and verified.
