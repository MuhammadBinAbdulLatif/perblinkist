# AGENT.md: PerBlinkist Engineering & Operating Guidelines

Welcome to **PerBlinkist**! This document serves as the primary system brief and operating instructions for AI agents and human developers building and maintaining this codebase.

---

## 1. Project Overview & Identity
- **Architecture & Framework**: **Next.js (App Router, TypeScript, React 19, Turbopack)**.
  - End-to-end type safety powered by **tRPC** (`server/routers/app.ts` + `@trpc/react-query` + `@tanstack/react-query`).
  - No split multi-server overhead. Standardized on tRPC procedures for backend operations (scanning, querying, updating progress), plus dedicated stream/cover route handlers for binary media delivery.
  - References: [`preferences/user-preferences.md`](file:///d:/projects/monos/perblinkist/preferences/user-preferences.md).
- **Package Manager**: **`pnpm`** exclusively.
- **Database & ORM**: **Prisma ORM** with **SQLite** (`DATABASE_URL="file:./config/perblinkist.db"`).
  - Data access managed via the singleton client at [`lib/prisma.ts`](file:///d:/projects/monos/perblinkist/lib/prisma.ts) and schema at [`prisma/schema.prisma`](file:///d:/projects/monos/perblinkist/prisma/schema.prisma).
- **Styling & UI**: **Tailwind CSS v4** + **Lucide React** icons.
- **Name**: PerBlinkist
- **Core Concept**: A lightweight, self-hosted, Dockerized Blinkist alternative for personal audiobook summaries and audio files.
- **Two Defining Pillars**:
  1. **Direct Directory Ingestion (No Manual Uploading)**: Mount a folder with thousands of files (`/media`), and the app scans it automatically.
  2. **Automated Metadata & Cover Scraping**: Intelligently query open book APIs (Google Books, Open Library) based on cleaned filenames to extract covers, authors, summaries, and categories.
- **Visual Identity & Theme**:
  - Clean, modern, minimalist aesthetic inspired by Blinkist / Spotify / Audible.
  - Emerald / Teal / Slate modern dark-mode & clean crisp light-mode palettes.
  - Card-based shelves, slick bottom audio player bar, and distraction-free typography.

---

## 2. Directory Layout & Structure

```
perblinkist/
├── agent.md                    # Core agent handbook and guidelines (this file)
├── preferences/                # User preferences and architectural choices
│   └── user-preferences.md     # Documented preference standards
├── specs/                      # Product and technical specifications
│   ├── mission.md              # Vision, problem statement, and goals
│   ├── tech-stack.md           # Architecture, technologies, and rationale
│   ├── roadmap.md              # Phase-by-phase development plan
│   └── <feature-name>/         # Feature specification folders (MANDATORY before coding)
│       ├── requirements.md     # Exact user stories, inputs, outputs, edge cases
│       ├── plan.md             # Architecture, schema diffs, implementation steps
│       └── validate.md         # Verification checklist and testing instructions
├── app/                        # Next.js App Router (Full-Stack)
│   ├── api/                    # Binary streaming & tRPC adapter
│   │   ├── trpc/[trpc]/        # tRPC HTTP batch endpoint
│   │   ├── stream/[id]/        # HTTP 206 Partial Content audio stream handler
│   │   └── covers/[fileName]/  # Cached local image route
│   ├── layout.tsx              # Root HTML shell & tRPC Query provider
│   ├── providers.tsx           # TRPCProvider & TanStack Query client
│   ├── page.tsx                # Blinkist-inspired home dashboard & player
│   └── globals.css             # Tailwind CSS styles
├── server/                     # Backend API & tRPC router
│   ├── trpc.ts                 # Base tRPC init and procedures
│   └── routers/                # Sub-routers and main appRouter
│       └── app.ts              # Query & mutation procedures (scan, books, progress)
├── lib/                        # Core shared utilities & singletons
│   ├── prisma.ts               # Prisma client singleton instance
│   ├── trpc.ts                 # Client-side createTRPCReact
│   ├── scanner.ts              # Recursive directory watcher & audio detector
│   └── metadata.ts             # Regex cleaners & Google Books / Open Library fetchers
├── prisma/                     # Database schema & migrations
│   └── schema.prisma           # Prisma models (BookSummary, Setting)
├── config/                     # Persistent runtime data (mount in Docker)
│   ├── perblinkist.db          # SQLite database file
│   └── cache/                  # Downloaded book cover images
├── media/                      # Read-only mounted directory with user's audio summaries
├── pnpm-lock.yaml              # Strict dependency lockfile
├── package.json                # Project scripts and dependencies
└── tsconfig.json               # TypeScript configuration
```

---

## 3. Mandatory Specification & Development Workflow

### Rule 1: Specs-First Feature Development
> [!IMPORTANT]
> **Strict Pre-Implementation Rule**:
> For EVERY individual feature or distinct functionality:
> 1. You MUST first create a dedicated directory inside `specs/<feature-name>/`.
> 2. Inside that directory, you MUST author three specific markdown files BEFORE writing any feature code:
>    - **`requirements.md`**: Problem statement, scope, inputs/outputs, user stories, acceptance criteria.
>    - **`plan.md`**: Architectural design, file changes, data models, tRPC procedures, step-by-step implementation plan.
>    - **`validate.md`**: Testing procedure, verification steps, edge cases check, and completion sign-off.
> 3. Only after the specification folder is created may implementation begin.

### Rule 2: Strict Step-by-Step Roadmap Execution
- The roadmap in [`specs/roadmap.md`](file:///d:/projects/monos/perblinkist/specs/roadmap.md) must be executed strictly step-by-step.
- Do not skip ahead or implement items out of order.

### Rule 3: Git Commit & GitHub Push Policy
> [!IMPORTANT]
> **Commit Frequency & Push Cadence**:
> - **Commit**: Make a Git commit after every good, meaningful chunk of work or code change (e.g. creating a feature spec, completing a schema migration, implementing a router).
> - **Push to GitHub**: Once a complete specification/milestone is finished and fully validated, push the branch to GitHub so all changes are preserved, reviewed, and versioned.

### Rule 4: Technology & Architecture Guardrails
- **Framework**: Modern Next.js with **tRPC** (`server/routers/app.ts`) + `@tanstack/react-query` for all client-server communication.
- **Streaming**: HTTP 206 Partial Content route handlers for audio streaming to guarantee instant seeking on mobile and desktop.
- **Database**: Prisma ORM with SQLite. No raw SQL or un-typed queries.
- **Package Manager**: Exclusively `pnpm`.

### Rule 5: Resilient Ingestion & Graceful Fallback
- Directory scans must **never crash** on missing tags or unfindable books.
- Strip tags, brackets, and bitrate markers cleanly (`lib/metadata.ts`).
- If Google Books and Open Library fail to match, gracefully store the cleaned file name and generate a stylish initial/gradient placeholder.
