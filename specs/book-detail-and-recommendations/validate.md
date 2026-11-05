# Validation Checklist: Audiobook Detail Page, Recommendations, Download & Listen Later

## 1. Schema & Database Verification
- [ ] Push `ListenLater` model to SQLite via Prisma.
- [ ] Ensure cascade deletion when user or book is removed.

## 2. Recommendation Engine Verification
- [ ] Verify external query executes against Google Books API.
- [ ] Verify local database cross-referencing accurately matches titles/authors against files on disk.
- [ ] Verify fallback returns relevant summaries in the library when external recommendations aren't in catalog.

## 3. Audio Download Verification
- [ ] Route `/api/download/[id]` returns 200 with `Content-Disposition: attachment`.
- [ ] Clean filename preserved in the download response.

## 4. UI & Flow Verification
- [ ] Route `/book/[id]` renders cleanly with centered player controls.
- [ ] Player seeking, playback position syncing, and speed controls work.
- [ ] "Listen Later" toggle persists in database and reflects on `/listen-later`.
- [ ] Recommendations shelf displays related books and navigates smoothly.
- [ ] Next.js Turbopack build passes with zero errors (`pnpm run build`).
