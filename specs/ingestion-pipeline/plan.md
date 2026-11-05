# Implementation Plan: Media Ingestion & Metadata Processing Pipeline

## 1. Architecture Overview
This plan defines the step-by-step implementation for backend audio processing, tag reading, open API scraping, and database modeling.

```
[ example-files / media ]
         │
         ▼
[ Recursive Scanner (lib/scanner.ts) ] 
   - Detects audio files including .mka
   - Computes file stats (size, mtime)
         │
         ▼
[ Audio Tag Inspector (music-metadata) ]
   - Extracts duration, codec, bitrate, embedded artist/title
         │
         ▼
[ Heuristic Title/Author Cleaner (lib/metadata.ts) ]
   - Regex matches "<Title> (<Author>)", handles nested parens
         │
         ▼
[ External Metadata Resolver (lib/metadata.ts) ]
   - Primary: Google Books API (high-res thumbnail, description, publisher, year, ISBN)
   - Secondary: Open Library API (fallback)
   - Tertiary: Embedded tags / Filename fallback
         │
         ▼
[ Local Poster Cache (config/cache/covers/<id>.jpg) ]
   - Downloads remote cover images for local serving
         │
         ▼
[ Prisma SQLite Database (config/perblinkist.db) ]
   - Upserts full `BookSummary` record with relation to physical file
```

---

## 2. Schema Refinements (`prisma/schema.prisma`)
Add audio container metadata fields to `BookSummary`:
- `format`: String? (e.g. `mka`, `mp3`)
- `codec`: String? (e.g. `OPUS`, `AAC`)
- `bitrate`: Int?
- `embeddedTitle`: String?
- `embeddedAuthor`: String?

---

## 3. Step-by-Step Implementation Tasks
1. **Update `prisma/schema.prisma`**:
   - Add technical audio metadata fields.
   - Run `pnpm exec prisma db push` to synchronize SQLite schema.
2. **Enhance `lib/metadata.ts`**:
   - Add specific regex parser for `<Title> (<Author>)` taking into account titles with internal parentheses like `Yes We (Still) Can (Dan Pfeiffer).mka`.
   - Support embedded tag overrides if Google Books / Open Library needs a better hint.
3. **Enhance `lib/scanner.ts`**:
   - Add `.mka` to `SUPPORTED_EXTENSIONS`.
   - Update MIME map for `.mka` -> `audio/x-matroska` or `audio/webm`.
   - Parse embedded Matroska tags via `music-metadata` and record container details.
4. **Create Ingestion CLI Runner (`scripts/ingest.ts`)**:
   - Provide a standalone runner that can be executed directly with `pnpm run ingest` to scan `example-files/` (or any target folder).
   - Display a formatted console table summarizing:
     - File Name
     - Resolved Title & Author
     - Source (`google_books`, `open_library`, `embedded`)
     - Duration in minutes
     - Local cover status
5. **Add Script to `package.json`**:
   - `"ingest": "tsx scripts/ingest.ts"`

---

## 4. Verification Checkpoint
Run the ingestion against all 10 `example-files` and verify:
- All 10 files are discovered and processed.
- Titles and authors are correctly parsed (e.g., `Yes We (Still) Can` by `Dan Pfeiffer`, `The Talent Code` by `Daniel Coyle`).
- Records are saved in SQLite with no crashes or unhandled rejections.
