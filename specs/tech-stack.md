# Tech Stack Specification: PerBlinkist

This document defines the selected technology stack, architectural decisions, and container strategy for PerBlinkist.

---

## 1. Stack Overview

| Layer | Technology | Rationale |
|---|---|---|
| **Full-Stack Framework** | **Next.js (App Router, TypeScript, React 19)** | Unified modern full-stack web application. Server Components, Route Handlers (streaming audio, directory scanning), no split client/server bloat. |
| **Package Manager** | **pnpm** | Ultra-fast, disk-efficient symlink-based package management. |
| **Database & ORM** | **Prisma ORM + SQLite (WAL mode)** | Fully type-safe models, automated migrations, zero-config embedded storage suited for containerized self-hosting. |
| **Styling & UI** | **Tailwind CSS + Lucide Icons + Radix / Tailwind-merge** | Modern, sophisticated Blinkist-like UI with smooth animations, dark-mode first, and responsive audio dock. |
| **Metadata Providers** | **Google Books API + Open Library API** | High coverage open APIs for book covers, author names, publishers, descriptions, and categories. |
| **Containerization** | **Docker & Docker Compose (Standalone Next.js output)** | Single self-contained container with `/media` and `/config` volume mounts. |

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
