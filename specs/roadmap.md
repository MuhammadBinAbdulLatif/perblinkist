# Development Roadmap: PerBlinkist

This roadmap organizes the development of PerBlinkist into phased milestones, moving from foundational infrastructure to polished discovery and recommendation features.

---

## Phase 1: Foundation & Project Scaffolding
- [ ] Initialize Git repository and project structure.
- [ ] Setup backend project (Fastify/Node.js or Go) with SQLite connection and schema migrations.
- [ ] Setup frontend project (Vite + React + Tailwind CSS + Lucide icons).
- [ ] Create Dockerfile and `docker-compose.yml` with `/media` and `/config` mounts.
- [ ] Setup development environment scripts (hot reloading, concurrent dev servers).

---

## Phase 2: Directory Ingestion & Metadata Pipeline
- [ ] **Directory Scanner**:
  - Recursive directory watcher/scanner for audio files (`.mp3`, `.m4a`, etc.).
  - File hashing or path tracking to prevent duplicate ingestion.
- [ ] **Heuristic Title Parser**:
  - Regex cleaner for tags, bracketed strings, quality metrics, and separator parsing (`Author - Title` vs `Title`).
- [ ] **Metadata Fetching Service**:
  - Google Books API client with rate-limiting & backoff.
  - Open Library API fallback.
  - Asynchronous background worker queue with progress events for the UI.
- [ ] **Local Asset Cache**:
  - Download and optimize cover posters locally.
  - Default placeholder generation for books without remote covers.

---

## Phase 3: Core Audio Streaming & Player UI
- [ ] **Streaming API**:
  - HTTP Range Request (`206 Partial Content`) audio streaming endpoint.
- [ ] **Web Audio Player (Persistent Bottom Dock)**:
  - Play/pause, 10s back / 30s forward, scrubbable progress bar, playback speed options (0.75x, 1x, 1.25x, 1.5x, 2x).
  - Web MediaSession API integration (controls in OS notification bar & lockscreen).
- [ ] **Playback History & Resume**:
  - Periodic progress persistence (`last_played_position`, `is_finished`).
  - "Continue Listening" drawer / card on home screen.

---

## Phase 4: UI / UX Polish & Home Experience
- [ ] **Blinkist-Style Dashboard**:
  - Hero "Pick for Today" / "Random Summary" spotlight.
  - "Discover Something New" carousel (randomized pool of library summaries).
  - "Recently Added" & "Recently Played" shelves.
- [ ] **Library & Search**:
  - Instant client/server search with fuzzy matching across titles, authors, and categories.
  - Filter by category, length, and listened status.
- [ ] **Book Detail Modal/View**:
  - Synopsis, author info, published year, audio duration, and one-click play.
  - Manual metadata edit modal (if a file was misidentified).

---

## Phase 5: Smart Discovery & Enhancements (Future Vision)
- [ ] Genre-based clustering and shelf generation.
- [ ] Similar books recommendation using API category vectors or author overlap.
- [ ] Multi-user profiles with personal listen history.
- [ ] PWA (Progressive Web App) manifest for mobile app-like home screen installation.
- [ ] Offline caching in browser IndexedDB for listening on the go.
