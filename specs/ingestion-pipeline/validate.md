# Validation & Verification Checklist: Media Ingestion Pipeline

## Test Scope
Verify that the ingestion pipeline processes all 10 sample files in `example-files/`, parses titles and authors accurately, queries external APIs, downloads covers, and stores the records cleanly in SQLite via Prisma.

---

## 1. Input Test Data
The target folder is `d:/projects/monos/perblinkist/example-files/` containing:
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

---

## 2. Validation Checklist

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **Audio Format Support** | `.mka` files are discovered and not skipped. | [ ] |
| **Parsing `Title (Author)`** | `The Talent Code` -> Title: `The Talent Code`, Author: `Daniel Coyle` | [ ] |
| **Parsing Nested Parentheses** | `Yes We (Still) Can (Dan Pfeiffer)` -> Title: `Yes We (Still) Can`, Author: `Dan Pfeiffer` | [ ] |
| **Duration Extraction** | `music-metadata` extracts duration accurately (~10-25 mins per summary). | [ ] |
| **Metadata Enrichment** | Google Books or Open Library returns cover, synopsis, and year. | [ ] |
| **Database Persistence** | Prisma SQLite database holds 10 records with file paths and metadata. | [ ] |
| **Cover Cache** | Downloaded `.jpg` covers exist in `config/cache/covers/`. | [ ] |
| **Zero Ingestion Failures** | Pipeline finishes with 0 unhandled rejections or crashes. | [ ] |

---

## 3. Test Command
```powershell
pnpm run ingest
```
or
```powershell
pnpm exec tsx scripts/ingest.ts
```
Expected output: A formatted table showing 10 indexed summaries and database verification count = 10.
