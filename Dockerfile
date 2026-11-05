# Multi-stage production Dockerfile for PerBlinkist
FROM node:20-alpine AS base

# Install core utilities
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# 1. Install ALL dependencies (including devDeps — needed for prisma CLI + build tools)
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

# 2. Build application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client.
# DATABASE_URL must be syntactically valid at generate time (actual value used only at runtime).
ENV DATABASE_URL="file:/tmp/build-placeholder.db"

RUN pnpm exec prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# 3. Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and standalone server bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy the generated Prisma client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Create mount points and permissions
RUN mkdir -p /media /config/cache/covers
RUN chown -R nextjs:nodejs /config /media

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
