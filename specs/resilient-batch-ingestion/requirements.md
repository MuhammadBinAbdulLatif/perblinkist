# Requirements: Resilient Batch Ingestion & Rate-Limited Enrichment

## 1. Problem Statement
When scaling PerBlinkist to libraries with thousands and tens of thousands of audio files, the previous ingestion pipeline had two critical bottlenecks:
1. **Unbounded external network calls**: Audio files were processed in a tight synchronous loop, making external API calls to Google Books and Open Library without controlled batching or delay, triggering HTTP 429 (Too Many Requests) and IP bans.
2. **Crash/Failure vulnerability & Loss of State**: If an API failed, a network blip occurred, or rate limits were encountered halfway through thousands of books, the scan either crashed or marked records with fallback status, without persisting granular metadata state (`indexed`, `enrichment_pending`, `enriched`, `rate_limited`, `failed`). The server lacked clarity on:
   - What files are physically indexed into SQLite (`BookSummary` created with file metadata/duration/tags)?
   - Which files have successfully obtained enriched metadata and covers?
   - Which files failed or are waiting for metadata?
   - When the rate limit reset timer expires to safely resume enrichment.

## 2. Goals & Key Capabilities
1. **Decoupled 2-Stage Ingestion**:
   - **Stage 1 (Local Indexing - Blazing Fast)**: Traverse the media volume, extract container/audio duration and embedded ID3/Vorbis/Matroska tags via `music-metadata`, and register every file in SQLite within seconds without touching external APIs.
   - **Stage 2 (Batch Enrichment - Controlled & Safe)**: Process unenriched audiobooks in batches of **10 items at a time**.
2. **Exponential Backoff & Rate Limit Memory**:
   - Explicit HTTP 429 / rate limit detection on Google Books and Open Library.
   - Server-level persistent cooldown memory: When rate-limited, record `rateLimitUntil` and pause enrichment for **1 minute**, then **2 minutes**, then **3 minutes** (exponential backoff).
   - Rate limit state persisted in the SQLite `Setting` table or in-memory lock with persistent timestamp so server restarts remember the cooldown.
3. **Transparent State Tracking for Thousands of Files**:
   - Granular status on `BookSummary`:
     - `indexingStatus`: `indexed` (local tags & file stats recorded)
     - `enrichmentStatus`: `pending` | `enriched` | `rate_limited` | `failed` | `skipped`
     - `enrichmentError`: Stores the error message or 429 status for diagnostics.
     - `enrichedAt`: Timestamp of successful metadata enrichment.
   - Queryable diagnostics: Easily retrieve the exact counts of files indexed, enriched, pending, and rate-limited.
4. **Resumable & Fault-Tolerant**:
   - If ingestion halts, crashes, or is restarted, it queries `where: { enrichmentStatus: { in: ['pending', 'rate_limited', 'failed'] } }` and resumes exactly where it left off, zero work duplicated.
