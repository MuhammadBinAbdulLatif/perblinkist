# Tech Stack Specification: PerBlinkist

This document defines the selected technology stack, architectural decisions, and container strategy for PerBlinkist.

---

## 1. Stack Overview

| Layer | Technology | Rationale |
|---|---|---|
| **Backend Framework** | **Go (Golang)** with **Gin** or **Fiber** (or **Node.js / Fastify + TypeScript**) | Ultra-fast file scanning, low memory footprint (~20MB in Docker), excellent HTTP/audio streaming support, single static binary execution. |
| **Database** | **SQLite (via WAL mode) + Prisma/GORM/SQLC** | Zero-config embedded database. Perfectly suited for self-hosted apps without spinning up a heavy separate Postgres/MySQL container. |
| **Frontend Framework** | **React + Vite + Tailwind CSS + Lucide Icons + TanStack Query** | High-performance SPA with modern Blinkist-like polish, smooth responsive carousels, bottom audio bar player, fast client-side routing. |
| **Metadata Providers** | **Google Books API + Open Library API** | High coverage open APIs for book covers, author names, publishers, descriptions, and categories. Free with no credit card required. |
| **Containerization** | **Docker & Docker Compose (Multi-stage build)** | Single self-contained image bundling backend + static frontend frontend assets + SQLite volume mount + media directory mount. |

---

## 2. Recommended Primary Choice: **Full-Stack TypeScript (Node.js/Fastify) OR Go + React SPA**

### Decision: **Node.js (Fastify + TypeScript) + SQLite + React (Vite/Tailwind)**
*(Alternatively Go with Fiber if pure binary speed and <30MB RAM is preferred)*:
- **Fastify / TypeScript**: Extremely fast asynchronous I/O, native JSON handling, rich ecosystem for ID3/metadata tagging (`music-metadata`), fuzzy search utilities (`fuse.js`), and stream range requests for audio seeking.
- **SQLite (better-sqlite3 / Prisma)**: Embedded, ACID-compliant, supports full-text search (FTS5) for fast in-app book searching.
- **Vite + React + Tailwind CSS**: Allows rapid iteration on beautiful, mobile-friendly Blinkist-inspired design, custom audio player dock, dark/light modes, and fluid UI animations.

---

## 3. Storage & Directory Layout in Docker

```
/
├── /media                # Read-only mount of user's summary audio files (.mp3, .m4a, .aac, .ogg)
├── /config               # Write mount for persistent data:
│   ├── perblinkist.db    # SQLite database (metadata, progress, settings)
│   └── /cache            # Local cache for fetched book cover images
```

---

## 4. Metadata Extraction & Cleaning Architecture

1. **Filename Cleaning Pipeline**:
   - Strips common prefixes/suffixes: `[Blinkist]`, `Summary of`, `(Audiobook)`, `128kbps`, bitrate markers, year stamps.
   - Parses `<Title> - <Author>` or queries `<Title>` directly.
2. **API Matching Hierarchy**:
   - **Primary**: Google Books API (`https://www.googleapis.com/books/v1/volumes?q=...`)
   - **Secondary / Fallback**: Open Library Covers & Books API (`https://openlibrary.org/search.json?q=...`)
3. **Image Caching**:
   - Remote cover images are downloaded and saved locally in `/config/cache/covers/<book_id>.jpg` to ensure offline readiness and fast image delivery.

---

## 5. Audio Streaming & Player Spec

- **HTTP Range Requests (`206 Partial Content`)**: Enables instant audio scrubbing and accurate seeking in the browser without downloading the full audio file upfront.
- **Audio Formats Supported**: `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`, `.opus`, `.wav`.
- **Playback State**:
  - Saved in SQLite per book (`playback_time`, `duration`, `completed_status`, `last_played_at`).
  - Seamless resume across sessions.
