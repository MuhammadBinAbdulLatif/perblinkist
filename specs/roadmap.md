# Development Roadmap: PerBlinkist

This roadmap organizes the development of PerBlinkist into phased milestones, moving from foundational infrastructure to polished discovery and recommendation features.

---

## Phase 1: Foundation & Project Scaffolding
- [x] Initialize Git repository, branch, and remote configuration.
- [x] Configure user preferences and agent handbook (`preferences/user-preferences.md`, `agent.md`).
- [x] Setup unified full-stack application using **Next.js (App Router, TypeScript, React 19)** and **pnpm**.
- [x] Configure **Prisma ORM** with SQLite (`prisma/schema.prisma`, `lib/prisma.ts`).
- [x] Create initial responsive Blinkist-inspired UI with Tailwind CSS v4 and Lucide React.
- [ ] Create production Dockerfile and `docker-compose.yml` with `/media` and `/config` volume mounts.

---

## Phase 2: Directory Ingestion & Metadata Pipeline
- [x] **Directory Scanner (`lib/scanner.ts`)**:
  - Recursive directory scanner for audio files (`.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`).
  - File size and modification time tracking for fast incremental rescans without re-reading unchanged files.
  - Scan trigger and progress status API route (tRPC `syncLibrary` / `getScanStatus`).
- [x] **Heuristic Title Parser (`lib/metadata.ts`)**:
  - Regex cleaner for tags, bracketed strings, bitrate markers, and separator parsing (`Author - Title` vs `Title`).
- [x] **Metadata Fetching Service**:
  - Google Books API client with per-provider rate-limiting & exponential backoff.
  - Open Library API fallback; Wikipedia teaser fallback.
  - Upsert discovered summaries into SQLite via Prisma.
- [x] **Local Asset Cache**:
  - Download and optimize cover posters to `config/cache/covers/`.
  - Stylish initials/gradient fallback placeholder when no remote cover is found.
- [x] **Automatic Startup Ingestion** (`instrumentation.ts`, `specs/startup-ingestion/`):
  - `instrumentation.ts` `register()` hook triggers on Node.js server boot (3 s delay, guarded by `AUTO_SCAN_ON_STARTUP`).
  - `runFullOrchestratedIngestion({ autoResumeOnRateLimit: true })` — sleeps through cooldowns and continues automatically.
  - Per-provider rate limiter (Google Books / Open Library) replaces global block; API key lowers inter-request delay from 500 ms → 100 ms.
  - Supports libraries of 3 000+ titles (up to 10 000 batches × 10 books).

---

## Phase 3: Core Audio Streaming & Player UI
- [ ] **Streaming API (`/api/stream/[id]`)**:
  - HTTP Range Request (`206 Partial Content`) audio streaming route handler.
  - Low-latency seeking and scrubbing support across mobile and desktop browsers.
- [ ] **Web Audio Player (Persistent Bottom Dock)**:
  - Play/pause, 10s back / 30s forward, scrubbable progress bar, playback speed options (0.75x, 1x, 1.25x, 1.5x, 2x).
  - Web MediaSession API integration (controls on OS notification bar and lockscreen).
- [ ] **Playback History & Resume**:
  - Automatic playback position syncing to Prisma database (`/api/books/progress`).
  - "Continue Listening" shelf on the home screen.

---

## Phase 4: UI / UX Polish & Home Experience
- [ ] **Blinkist-Style Dashboard**:
  - Hero "Spotlight of the Day" / "Random Pick".
  - "Discover Something New" carousel (randomized summaries from SQLite).
  - "Recently Added" and "Recently Played" shelves.
- [ ] **Library & Search**:
  - Instant search across titles, authors, and categories.
  - Filter by category, length, and listened status.
- [ ] **Book Detail Modal**:
  - Synopsis, author info, published year, duration, and one-click play.
  - Manual metadata edit modal (if a file was misidentified).

---

## Phase 5: Smart Discovery & Enhancements (Future Vision)
- [ ] Genre-based clustering and shelf generation.
- [ ] Similar books recommendation using API category vectors or author overlap.
- [ ] Multi-user profiles with personal listen history.
- [ ] PWA (Progressive Web App) manifest for mobile app-like home screen installation.
- [ ] Offline caching in browser IndexedDB for listening on the go.
