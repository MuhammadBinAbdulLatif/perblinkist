# Startup Ingestion — Validation Checklist

Validation criteria for the automatic media scan / enrichment feature introduced via
`instrumentation.ts` + `lib/scanner.ts` (`autoResumeOnRateLimit` mode).

---

## 1. Boot-time scan triggers automatically

| # | Check | Expected result |
|---|-------|-----------------|
| 1.1 | Start `pnpm dev` with at least one `.mp3`/`.m4b` file in the configured media directory | Server console shows `[Startup] Beginning automatic media scan…` within ~3 s of boot |
| 1.2 | No user interaction required | Books appear in the dashboard without clicking **Sync Library** |
| 1.3 | `AUTO_SCAN_ON_STARTUP=false` in `.env` | Log line is **not** printed; dashboard stays empty until manual sync |

## 2. Enrichment progresses without manual intervention

| # | Check | Expected result |
|---|-------|-----------------|
| 2.1 | Leave the server running after boot | Dashboard `enrichmentStatus` values transition from `pending` → `enriched` automatically |
| 2.2 | Server console | Batch log lines appear: `[Batch Orchestrator] Processing batch N…` |
| 2.3 | All books processed | Console shows `[Batch Orchestrator] All books successfully enriched!` and status flips to `completed` |

## 3. Rate-limit auto-resume (key path for large libraries)

| # | Check | Expected result |
|---|-------|-----------------|
| 3.1 | Temporarily remove `GOOGLE_BOOKS_API_KEY` and restart | Console logs `Rate limited on batch N. Sleeping Xs then resuming…` |
| 3.2 | After sleep expires | Orchestrator continues with the next batch — **no manual reset needed** |
| 3.3 | `isOrchestratorRunning` during sleep | The flag is `false` during the sleep window so the UI can still read status |

## 4. Container restart mid-enrichment

| # | Check | Expected result |
|---|-------|-----------------|
| 4.1 | Kill and restart the container while some books are `pending` | Already-`enriched` books remain enriched (Prisma + SQLite volume persists) |
| 4.2 | Books still `pending` after restart | Re-picked up and enriched in the next run — no duplicate work |
| 4.3 | Books in `rate_limited` state | Reset to `pending` by `processBatchEnrichment` before the next batch fetch |

## 5. Inter-request delay scales with API key

| # | Check | Expected result |
|---|-------|-----------------|
| 5.1 | `GOOGLE_BOOKS_API_KEY` present | Server-side delay between requests is ~100 ms (visible in timing logs) |
| 5.2 | No `GOOGLE_BOOKS_API_KEY` | Delay is ~500 ms |

## 6. Large library capacity

| # | Check | Expected result |
|---|-------|-----------------|
| 6.1 | Drop 500+ files into the media directory | `fastIndexMediaDirectory` completes within a few seconds (I/O only, no enrichment) |
| 6.2 | Orchestrator runs up to 10 000 batches (100 000 files) before giving up | `maxBatches` guard never triggers for realistic libraries |
| 6.3 | Memory stays stable over a full run | No unbounded arrays or leaks in the batch loop |

## 7. Edge cases

| # | Check | Expected result |
|---|-------|-----------------|
| 7.1 | Media directory does not exist on first boot | `fastIndexMediaDirectory` logs a warning, does **not** crash the server |
| 7.2 | `register()` called in Edge runtime (middleware) | Guard `NEXT_RUNTIME !== 'nodejs'` exits early — no DB calls, no crash |
| 7.3 | Two `register()` calls (HMR reload in dev) | `isOrchestratorRunning` guard returns early on the second call |

---

## Sign-off

- [ ] All items in sections 1–5 manually verified on `pnpm dev`
- [ ] Section 6 spot-checked with ≥ 50 dummy files
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm build` completes successfully
