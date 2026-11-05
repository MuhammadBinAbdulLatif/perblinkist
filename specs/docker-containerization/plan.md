# Implementation Plan: Docker Containerization

## 1. Architectural Strategy
- Enable `output: 'standalone'` in [`next.config.ts`](file:///d:/projects/monos/perblinkist/next.config.ts) to produce an optimized, self-contained Node server bundle that does not require `node_modules` in production.
- Use multi-stage Docker build:
  1. `base`: `node:20-alpine` with `corepack enable` for `pnpm`.
  2. `deps`: Install dependencies with frozen lockfile.
  3. `builder`: Run `prisma generate` and `pnpm run build`.
  4. `runner`: Copy standalone server, static assets, and prisma client.

---

## 2. Docker Compose Configuration (`docker-compose.yml`)
```yaml
services:
  perblinkist:
    image: perblinkist:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: perblinkist
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=file:/config/perblinkist.db
      - MEDIA_DIR=/media
      - JWT_SECRET=change-this-to-a-secure-random-string
    volumes:
      - ./config:/config
      - ./media:/media:ro
```

---

## 3. Entrypoint Startup Script (`docker-entrypoint.sh`)
Before starting Next.js:
- Ensure `/config/cache/covers` exists.
- Run `prisma db push` to automatically initialize or migrate the database in `/config/perblinkist.db`.
- Run `node server.js`.
