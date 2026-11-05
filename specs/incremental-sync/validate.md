# Validation Checklist: Incremental Media Sync

## Verification Matrix

| Check | Expected Result | Pass/Fail |
|---|---|---|
| **Zero-Network Rescan** | Scanning an unchanged directory triggers 0 external HTTP API calls. | [ ] |
| **Rescan Speed** | Scanning an unchanged directory of 10+ files completes in under 150ms. | [ ] |
| **New File Detection** | Adding 1 new `.mka` file indexes only that file (`newAdded == 1`, `unchanged == N`). | [ ] |
| **Accurate File Signature** | Both `fileSize` and `fileMtime` are tracked in SQLite. | [ ] |
| **Orphaned File Handling** | Deleting a file from disk updates or prunes its record in the database. | [ ] |
| **Batch Prisma Read** | Existing file index pre-loaded in a single query rather than N queries. | [ ] |

---

## Test Execution Command
```powershell
pnpm exec tsx scripts/test-incremental-sync.ts
```
