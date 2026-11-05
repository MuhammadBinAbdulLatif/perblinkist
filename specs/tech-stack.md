# Tech Stack Specification: PerBlinkist

This document defines the selected technology stack, architectural decisions, and container strategy for PerBlinkist.

---

## 1. Stack Overview

| Layer | Technology | Rationale |
|---|---|---|
| **Full-Stack Framework** | **Next.js (App Router, TypeScript, React 19, Turbopack)** | Unified modern full-stack web application. Server Components, Route Handlers (streaming audio, cover delivery), and tRPC adapters. |
| **API & Client-Server Layer** | **tRPC (v11) + TanStack React Query (v5)** | Full end-to-end type safety, auto-generated TypeScript hooks (`trpc.getRandomBooks.useQuery`), automatic caching, background refetching, and zero manual endpoint glue. |
| **Package Manager** | **`pnpm`** | Ultra-fast, disk-efficient symlink-based package management. |
| **Database & ORM** | **Prisma ORM + SQLite (WAL mode)** | Fully type-safe models, automated migrations, zero-config embedded storage suited for containerized self-hosting. |
| **Styling & UI** | **Tailwind CSS v4 + Lucide Icons** | Modern, sophisticated Blinkist-like UI with smooth animations, dark-mode first, and responsive persistent audio dock. |
| **Metadata Providers** | **Google Books API + Open Library API** | High coverage open APIs for book covers, author names, publishers, descriptions, and categories. |
| **Audio Processing** | **`music-metadata`** | Fast in-process audio header parsing for exact duration detection (`.mp3`, `.m4a`, etc.). |
| **Containerization** | **Docker & Docker Compose (Standalone Next.js output)** | Single self-contained container with `/media` and `/config` volume mounts. |

---

## 2. Core Architectural Decisions

### Decision: **Next.js + tRPC Inside Next.js + Prisma + SQLite**
- **tRPC Inside Next.js (`/api/trpc/[trpc]`)**:
  - Provides type-safe RPC procedures defined in `server/routers/app.ts`.
  - Type-safe mutations (`triggerScan`, `updateProgress`) and queries (`getBooks`, `getRandomBooks`, `searchBooks`, `getScanStatus`).
  - No hand-written REST controllers or route duplication.
- **Dedicated Media Delivery Route Handlers**:
  - `/api/stream/[id]`: Native Node.js `fs.createReadStream` supporting HTTP 206 Partial Content for byte-range seeking and scrubbing.
  - `/api/covers/[fileName]`: Cached local book covers with immutable caching headers.
- **Prisma + SQLite**:
  - Embedded SQLite database located at `config/perblinkist.db`.
  - Type-safe queries via `@prisma/client`.
  - Zero external database container required.

---

## 3. Storage & Directory Layout in Docker

```
/
├── /media                # Read-only mount of user's summary audio files (.mp3, .m4a, .aac, .ogg)
├── /config               # Write mount for persistent data:
│   ├── perblinkist.db    # SQLite database (managed via Prisma)
│   └── /cache            # Local cache for fetched book cover images
```

---

## 4. Metadata Extraction & Cleaning Architecture

1. **Filename Cleaning Pipeline (`lib/metadata.ts`)**:
   - Strips common prefixes/suffixes: `[Blinkist]`, `Summary of`, `(Audiobook)`, `128kbps`, bitrate markers, year stamps.
   - Parses `<Title> - <Author>` or queries `<Title>` directly.
2. **API Matching Hierarchy**:
   - **Primary**: Google Books API (`https://www.googleapis.com/books/v1/volumes?q=...`)
   - **Secondary / Fallback**: Open Library Covers & Books API (`https://openlibrary.org/search.json?q=...`)
3. **Image Caching**:
   - Remote cover images are downloaded and saved locally in `config/cache/covers/<book_id>.jpg` to ensure offline readiness and fast image delivery.

---

## 5. Audio Streaming & Player Spec

- **HTTP Range Requests (`206 Partial Content`)**: Enables instant audio scrubbing and accurate seeking in the browser without downloading the full audio file upfront.
- **Audio Formats Supported**: `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`, `.opus`, `.wav`.
- **Playback State**:
  - Persisted in Prisma SQLite database per book (`playbackPosition`, `durationSeconds`, `isCompleted`, `lastPlayedAt`).
  - Seamless resume across sessions.
