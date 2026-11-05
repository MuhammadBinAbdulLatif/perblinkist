# Plan: Resilient Batch Ingestion & Rate-Limited Enrichment

## 1. Schema Updates (`prisma/schema.prisma`)
Add explicit enrichment state and diagnostics fields to `BookSummary`:
```prisma
model BookSummary {
  // Existing fields ...

  // Granular Ingestion & Enrichment State Tracking
  indexingStatus    String    @default("indexed") // "indexed"
  enrichmentStatus  String    @default("pending") // "pending" | "enriched" | "rate_limited" | "failed" | "skipped"
  enrichmentError   String?                       // Diagnostics message (e.g., "HTTP 429: Rate limit reached")
  enrichedAt        DateTime?                     // Timestamp when metadata was enriched
  retryCount        Int       @default(0)         // Number of enrichment retry attempts

  @@index([enrichmentStatus])
}
```

## 2. Rate Limiting & Cooldown Management (`lib/metadata.ts`)
1. Implement `RateLimitManager`:
   - Tracks current backoff tier: `1 min` -> `2 mins` -> `3 mins` (or dynamic `Retry-After` if provided by header).
   - Records `cooldownUntil: number` in-memory and optionally syncs to `Setting` table.
   - Intercepts HTTP 429 response from `fetchGoogleBooks` and `fetchOpenLibrary`, sets cooldown, and throws/returns a specific `RateLimitError`.
   - Method `isCoolingDown(): { coolingDown: boolean; remainingSeconds: number }`.

## 3. Two-Stage Batch Pipeline (`lib/scanner.ts`)
1. **Stage 1: Fast Disk Indexing (`indexAudioFiles`)**:
   - Recursively traverses media directory.
   - Performs fast upsert of file stats, duration, embedded ID3/tags.
   - Sets `indexingStatus: "indexed"`. If new or unenriched, sets `enrichmentStatus: "pending"`.
2. **Stage 2: Batched Enrichment (`enrichPendingBooks`)**:
   - Accepts a batch size parameter (default `10`).
   - Fetches up to `10` books where `enrichmentStatus` is `'pending'` or eligible `'rate_limited'`.
   - Iterates through the 10 books sequentially or with controlled micro-delay (e.g. 200ms) to be polite.
   - If an API returns HTTP 429, triggers rate-limit backoff (1 min -> 2 min -> 3 min), flags remaining books in batch as `rate_limited`, and yields status.
   - Saves cover cache and updates `enrichmentStatus: "enriched"`, `isEnriched: true`, `enrichedAt: new Date()`.
3. **Scan Status & Metrics (`getDetailedScanStats`)**:
   - Aggregates:
     - `totalFilesOnDisk`
     - `totalIndexed`
     - `totalEnriched`
     - `totalPending`
     - `totalRateLimited`
     - `totalFailed`
     - `cooldownRemainingSeconds`

## 4. tRPC Router & API Updates (`server/routers/app.ts`)
1. `getScanStats`: Returns the real-time breakdown of indexed vs enriched vs pending vs rate-limited.
2. `startScan`: Triggers the fast index + initiates batched enrichment.
3. `resumeEnrichment`: Explicit mutation to trigger the next 10-item batch or continue enrichment after cooldown.

## 5. Implementation Steps
1. Update `prisma/schema.prisma` with enrichment status fields.
2. Run `npx prisma db push` or `prisma migrate`.
3. Enhance `lib/metadata.ts` with rate-limit detection, backoff state machine, and error handling.
4. Refactor `lib/scanner.ts` to implement 2-stage decoupled indexing & 10-item batch enrichment.
5. Expose procedures in `server/routers/app.ts`.
6. Update frontend UI in `app/page.tsx` if needed to display batch progress & rate limit cooldown indicators.
