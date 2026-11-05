# Requirements: Media Ingestion & Metadata Processing Pipeline

## 1. Overview & Objective
This feature establishes the automated, backend-only ingestion and metadata processing engine for PerBlinkist.
Inspired by Jellyfin/Plex media library scraping, it takes raw media files (e.g. from `/media` or `/example-files`), discovers audio summaries, extracts embedded tags, resolves rich metadata and cover images from open APIs, and stores complete structured records in the SQLite database via Prisma.

**Crucially, this phase is strictly focused on backend data processing and modeling; presentation/UI is decoupled.**

---

## 2. Input Analysis (Based on Real Samples)
Examining the 10 provided files in `example-files/`:
1. `Beowulf (Unknown).mka`
2. `Collaborative Intelligence (Dawna Markova).mka`
3. `Common Sense (Thomas Paine).mka`
4. `Irrationality (Stuart Sutherland).mka`
5. `Long-Term Thinking for a Short-Sighted World (Jim Brumm).mka`
6. `Pageboy (Elliot Page).mka`
7. `Peace Is Every Step (Thich Nhat Hanh).mka`
8. `Robert's Rules of Order (Henry M. Robert III).mka`
9. `The Talent Code (Daniel Coyle).mka`
10. `Yes We (Still) Can (Dan Pfeiffer).mka`

### Key Observations:
- **Format**: Matroska Audio (`.mka`) containing Opus audio streams (e.g. 32kbps VBR mono, ~15-20 min duration).
- **Naming Pattern**: `<Book Title> (<Author Name>).mka`. Notice that parentheses may contain multiple words, middle initials, or parenthetical titles (e.g., `Yes We (Still) Can (Dan Pfeiffer).mka` where the author is in the last parentheses, and the earlier parentheses are part of the title).
- **Embedded Tags**: Already include `artist` (Author), `name` (Title), and `genre`. However, they lack cover images, ISBN, synopsis/descriptions, and publication years, which must be fetched via Google Books / Open Library APIs.

---

## 3. Scope & Acceptance Criteria

### Requirement 1: Supported Audio Extensions
The scanner must recognize `.mka` in addition to `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`, `.opus`, and `.wav`.

### Requirement 2: Resilient Filename Parser
- Must extract title and author accurately from patterns like:
  - `<Title> (<Author>).<ext>`
  - `<Author> - <Title>.<ext>`
  - `<Title> by <Author>.<ext>`
  - Handles nested/multiple parentheses cleanly (e.g. `Yes We (Still) Can (Dan Pfeiffer).mka` -> Title: `Yes We (Still) Can`, Author: `Dan Pfeiffer`).

### Requirement 3: Jellyfin-Style Data Modeling
- **Database Model**: Store comprehensive book records (`id`, `filePath`, `fileHash`, `fileSize`, `fileName`, `format`, `codec`, `title`, `author`, `durationSeconds`, `coverUrl`, `localCoverPath`, `synopsis`, `category`, `publisher`, `publishedYear`, `isbn`, `matchedSource`, `isEnriched`).
- **Metadata Association**: Link each physical audio file to its resolved book metadata record.
- **Local Asset Caching**: Automatically download poster covers to `config/cache/covers/<id>.jpg` and serve locally.

### Requirement 4: Embedded Metadata Fallback & Enrichment Pipeline
1. Check internal audio tags (`music-metadata` common tags: `artist`, `title`, `genre`).
2. Query Google Books API with title + author hint.
3. Fallback to Open Library API if Google Books returns 0 items.
4. Fallback to embedded tags or parsed filename if neither API returns a match.
5. Ingestion must **never fail** or throw fatal errors on any single file.

### Requirement 5: Executable CLI / Ingestion Service & Test Script
- Provide a runnable ingestion script (`pnpm run ingest` or test runner) that processes the `example-files/` folder directly and outputs a detailed summary table of indexed books in SQLite.
