# Requirements: Incremental Media Sync & File Change Tracking

## 1. Objective & Problem Statement
Users will continuously add new audio summaries to their mounted media directory (`/media` in Docker or `example-files` / `media` locally).
Libraries may contain thousands of files.

If the scanner hits external APIs (Google Books, Open Library) for all files on every scan:
1. It wastes network bandwidth and risks severe API rate-limiting / HTTP 429 errors.
2. Scans would take minutes instead of milliseconds.
3. Already downloaded cover images and user edits would be redundantly re-fetched or overwritten.

The system must implement **smart incremental syncing**:
- Only newly discovered files or files whose size/timestamp changed should trigger API calls.
- Unchanged files must be detected in milliseconds using filesystem metadata comparisons without hitting the network.
- Files removed from the directory should be identified and flagged or pruned.

---

## 2. Scope & Acceptance Criteria

### Requirement 1: Change Detection Heuristic (File Signature)
Track a fast composite signature for each audio file in SQLite:
- `filePath` (primary key / unique index)
- `fileSize` (exact byte count)
- `fileMtime` (filesystem modification timestamp in ms or ISO string)
- `fileHash` (optional quick hash or `size + mtime` signature)

### Requirement 2: Three-Way File Categorization on Rescan
When a scan is triggered (via tRPC `triggerScan` or CLI), the scanner must categorize files into:
1. **Unchanged Files**: Path exists in database, `fileSize` and `mtime` match. **Skip immediately with zero API calls.**
2. **New / Added Files**: Path does not exist in database. Extract audio tags, hit Google Books / Open Library, download cover, insert into SQLite.
3. **Modified Files**: Path exists, but size or mtime differs. Re-read audio metadata and re-enrich.
4. **Deleted / Orphaned Files**: Path exists in database, but file no longer exists in directory. Clean up record (or mark `isDeleted: true`).

### Requirement 3: Detailed Metrics & Progress Reporting
The `getScanStatus` procedure must report:
- `totalFound`: Total files present on disk
- `unchanged`: Number of files skipped with zero network calls
- `newAdded`: Number of newly indexed files
- `modified`: Number of updated files
- `removed`: Number of deleted records pruned
- `durationMs`: Total duration of the sync run

### Requirement 4: Automated Verification
- Provide `scripts/test-incremental-sync.ts`:
  1. Perform initial scan of test directory.
  2. Perform second scan immediately -> assert `unchanged == totalFound`, `newAdded == 0`, network calls == 0, scan takes < 100ms.
  3. Add a temporary new file to the directory -> perform third scan -> assert `newAdded == 1`, `unchanged == totalFound - 1`.
  4. Delete the temporary file -> perform fourth scan -> assert `removed == 1`.
