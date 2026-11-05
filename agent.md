# AGENT.md: PerBlinkist Engineering & Operating Guidelines

Welcome to **PerBlinkist**! This document serves as the primary system brief and operating instructions for AI agents and human developers building and maintaining this codebase.

---

## 1. Project Overview & Identity
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
├── specs/                      # Product and technical specifications
│   ├── mission.md              # Vision, problem statement, and goals
│   ├── tech-stack.md           # Architecture, technologies, and rationale
│   └── roadmap.md              # Phase-by-phase development plan
├── server/                     # Backend API & scanner service
│   ├── src/
│   │   ├── scanner/            # Directory ingestion & file watching
│   │   ├── metadata/           # Cleaners, Google Books / Open Library fetchers
│   │   ├── stream/             # HTTP 206 Partial Content audio stream handler
│   │   ├── db/                 # SQLite database client and schema
│   │   └── routes/             # REST/RPC API endpoints
│   └── Dockerfile
├── web/                        # Modern React SPA frontend
│   ├── src/
│   │   ├── components/         # UI components (Player, Shelf, Carousel, BookCard)
│   │   ├── hooks/              # Audio playback hooks, API queries
│   │   ├── views/              # Home, Library, Settings views
│   │   └── stores/             # Audio player state management
│   └── Dockerfile
├── docker-compose.yml          # Top-level Docker orchestrator
└── README.md                   # User quickstart and setup guide
```

---

## 3. Agent Behavior & Development Rules

### Rule 1: Always Push to GitHub on Every Meaningful Change
> [!IMPORTANT]
> **Commit and Push Policy**: Every time a feature, fix, or spec change is completed, commit and push the changes to GitHub with a clean, semantic commit message (e.g., `feat: implement google books metadata provider`, `fix: range header audio seeking bug`). This guarantees full review history, safety checkpoints, and transparency.

### Rule 2: Developer Convenience & Best Practices
- As the AI developer, choose clean, maintainable, standard libraries.
- Prefer simplicity and low runtime resource usage: SQLite over heavy external databases, light Node/Fastify or Go backends over bloated stacks.
- Keep the frontend snappy: don't request the entire library in one unpaginated payload. Use virtualized lists or cursor pagination when handling thousands of files.

### Rule 3: Graceful Degradation & Resilient Ingestion
- If an API call fails or a book is not found in Google Books/Open Library, **never fail the ingestion process**.
- Store the book using its cleaned file name, generate a stylish SVG or CSS gradient cover placeholder with title initials, and flag the record for later automatic or manual enrichment.
- Always sanitize filenames before sending them to external APIs (strip tags, bitrates, brackets, format extensions).

### Rule 4: Clean Audio Streaming
- Audio playback must always support `Range` headers (`HTTP 206 Partial Content`) to ensure scrubbing, fast forward, and rewind work seamlessly in all modern browsers and mobile devices.

### Rule 5: User Empathy & Polish
- Ensure responsive design (works well on mobile browsers as well as desktop screens).
- Provide immediate feedback during scanning (e.g., scan progress percentage, total books indexed, matched vs fallback).
