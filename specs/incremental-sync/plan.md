# Implementation Plan: Incremental Media Sync & File Change Tracking

## 1. Schema Additions (`prisma/schema.prisma`)
Add modification timestamp to `BookSummary`:
```prisma
model BookSummary {
  // ...
  fileMtime       DateTime? // Last modified timestamp of physical audio file
  isMissing       Boolean   @default(false) // True if file disappeared from mounted volume
}
```

---

## 2. In-Memory Map Pre-Filtering Algorithm
To achieve sub-second execution across thousands of files:
1. Fetch all existing records from Prisma in one lightweight query:
   ```ts
   const existingMap = new Map(
     (await prisma.bookSummary.findMany({ select: { filePath: true, fileSize: true, fileMtime: true, isEnriched: true } }))
       .map(b => [b.filePath, b])
   );
   ```
2. For each physical file detected:
   - Compare `stat.size === existing.fileSize` AND `Math.floor(stat.mtimeMs) === existing.fileMtime?.getTime()`.
   - If matched and `existing.isEnriched`: **Skip immediately** (increment `unchangedCounter`).
   - If missing: Add to `toIngestQueue`.
   - If modified: Add to `toUpdateQueue`.
3. Detect deleted files:
   - `filesOnDiskSet = new Set(audioFiles)`
   - Any `dbRecord` where `!filesOnDiskSet.has(dbRecord.filePath)` is marked as missing or removed.

---

## 3. Network Call Guard
Wrap `resolveBookMetadata` with a logger/counter spy during tests to mathematically prove 0 API calls happen during an unchanged rescan.

---

## 4. tRPC & UI Update
- Update `ScanProgress` interface in `lib/scanner.ts`.
- Expose `unchanged`, `newAdded`, `modified`, and `removed` in tRPC `getScanStatus`.
- Update home UI to display: e.g. "Scan completed: 10 unchanged, 1 new, 0 errors in 45ms".

---

## 5. Verification Checkpoint
Run `pnpm exec tsx scripts/test-incremental-sync.ts` and verify:
- Instant rescan on unchanged folder skips 100% of network calls.
- Adding a single file processes *only* that single file.
