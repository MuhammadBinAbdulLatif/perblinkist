# Requirements: Automatic Startup Ingestion & Continuous Processing

## 1. Overview & Problem
When deploying PerBlinkist in Docker (e.g. `docker-compose up -d`) with `/media` mounted containing thousands of audiobooks, the app should not depend on a user visiting the web UI and clicking "Sync Library". It must automatically detect files upon server boot, index them instantly, and continuously enrich metadata in the background.

## 2. User Stories
- **US-1**: As a self-hoster, when my Docker container boots up with a mounted `/media` directory, all new/modified audiobooks are automatically discovered and cataloged without manual intervention.
- **US-2**: As a user, the web dashboard and audio player remain immediately responsive during startup; indexing and enrichment do not block HTTP traffic.
- **US-3**: As a user with 3,000+ files, if rate limits are encountered, the background orchestrator pauses for the cooldown window and automatically resumes processing without human intervention.
- **US-4**: As an administrator, I can configure or disable automatic startup scanning via an environment variable (`AUTO_SCAN_ON_STARTUP=false`).

## 3. Scope & Acceptance Criteria
- [x] Standard Next.js server initialization using `instrumentation.ts` hook.
- [x] Checks `process.env.NEXT_RUNTIME === 'nodejs'` to ensure it only executes in the server environment.
- [x] Fast disk indexing begins asynchronously upon startup without blocking `register()`.
- [x] Background orchestrator loops through pending batches and automatically sleeps + resumes if rate limited, rather than terminating early.
- [x] Concurrency guard (`isOrchestratorRunning`) prevents duplicate overlapping background workers.
