# Implementation Plan: Automatic Startup Ingestion & Continuous Processing

## 1. Architectural Strategy
We utilize the official Next.js server lifecycle file [`instrumentation.ts`](file:///d:/projects/monos/perblinkist/instrumentation.ts).
Inside `export async function register()`, we check:
1. `process.env.NEXT_RUNTIME === 'nodejs'`
2. `process.env.AUTO_SCAN_ON_STARTUP !== 'false'`

If enabled, we invoke `runFullOrchestratedIngestion({ autoResumeOnRateLimit: true })` asynchronously without `await`ing, allowing Next.js to start serving incoming HTTP traffic immediately.

## 2. Orchestrator Enhancement (`lib/scanner.ts`)
Upgrade `runFullOrchestratedIngestion`:
- Introduce `autoResumeOnRateLimit: boolean` (default `true`).
- When a batch reports `rateLimited: true`, instead of `break`, sleep for `batchResult.cooldownSeconds * 1000 + 1000` ms, then continue the loop.
- Honor cancellation/shutdown if process receives termination signals.
- Micro-delay tuning: if `GOOGLE_BOOKS_API_KEY` is present, reduce delay to 100ms for faster ingestion of large libraries.

## 3. Files to Create & Modify
1. Create `instrumentation.ts` in repo root.
2. Update [`lib/scanner.ts`](file:///d:/projects/monos/perblinkist/lib/scanner.ts) to support continuous auto-resuming on cooldown.
3. Verify type check and Next.js Turbopack build.
