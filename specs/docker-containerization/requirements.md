# Requirements: Docker Containerization & Deployment Orchestration

## 1. Objective & Problem Statement
PerBlinkist is an open-source, self-hosted media server designed to be deployed with zero hassle using Docker and Docker Compose.
Users should be able to clone the repository or pull an image, mount their directory of audio files, and have a fully running media server within seconds.

---

## 2. Scope & Acceptance Criteria

### Requirement 1: Multi-Stage Production Dockerfile
- **Build Stage**:
  - Node.js LTS base image with `pnpm` installed.
  - Builds Next.js in `standalone` output mode.
  - Generates Prisma client and runs database setup.
- **Runner Stage**:
  - Minimal Alpine/Debian slim base.
  - Non-root user (`node` / `nextjs`) for container security.
  - Production runtime dependencies only (under 250MB image footprint).

### Requirement 2: Volumes & Configuration
- `/media`: **Read-only** mount (`:ro`) pointing to host directory containing audio files.
- `/config`: Read-write mount for persistent SQLite database (`perblinkist.db`) and cover cache (`/config/cache/covers`).

### Requirement 3: `docker-compose.yml`
- Clean, self-contained compose file with environment variables:
  - `PORT=3000`
  - `DATABASE_URL=file:/config/perblinkist.db`
  - `MEDIA_DIR=/media`
  - `JWT_SECRET=generate-or-pass`
- Healthcheck validating HTTP 200 on `/api/trpc/auth.status`.

### Requirement 4: Verification
- Dry-run validation of `docker-compose.yml` syntax.
- Standalone build verification in `next.config.ts`.
