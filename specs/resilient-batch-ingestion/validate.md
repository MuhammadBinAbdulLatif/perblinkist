# Validation: Resilient Batch Ingestion & Rate-Limited Enrichment

## 1. Automated Unit & Integration Tests
1. **Prisma Schema Verification**:
   - Verify `indexingStatus`, `enrichmentStatus`, `enrichmentError`, and `enrichedAt` are properly migrated to SQLite.
2. **Batch Ingestion Verification**:
   - Run indexing on files in `example-files` or test directory.
   - Verify all files are promptly marked `indexed` with `pending` enrichment before external calls.
   - Run batch enrichment of size 10; verify exactly up to 10 files are processed per cycle.
3. **Rate Limit Handling Verification**:
   - Simulate HTTP 429 status code or rate limit condition.
   - Verify server sets backoff timer (1 min, 2 min, 3 min), flags status as `rate_limited`, and halts further external queries until cooldown expires.
   - Verify server diagnostics correctly return `coolingDown: true` and remaining seconds.
4. **Crash / Interrupt Recovery Verification**:
   - Interrupt/halt after partial batch.
   - Trigger rescan/enrichment again; verify previously enriched items are skipped and only remaining `pending` or `rate_limited` items are selected.

## 2. Production Build Check
- Run `pnpm run build` to verify full TypeScript compilation and Next.js Turbopack build pass with zero errors.
