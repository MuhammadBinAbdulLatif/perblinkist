#!/bin/sh
set -e

echo "[Entrypoint] Ensuring /config directories exist..."
mkdir -p /config/cache/covers

# When the entrypoint runs as root (default before dropping privileges),
# make sure the non-root app user can write the SQLite DB and cover cache
# on freshly mounted host volumes.
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /config 2>/dev/null || true
fi

echo "[Entrypoint] Applying Prisma schema to SQLite database..."
if [ "$(id -u)" = "0" ]; then
  su-exec nextjs prisma db push --skip-generate --schema=/app/prisma/schema.prisma
else
  prisma db push --skip-generate --schema=/app/prisma/schema.prisma
fi

echo "[Entrypoint] Starting PerBlinkist..."
if [ "$(id -u)" = "0" ]; then
  exec su-exec nextjs "$@"
else
  exec "$@"
fi
