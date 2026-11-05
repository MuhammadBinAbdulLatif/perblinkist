/**
 * instrumentation.ts — Next.js Server Lifecycle Hook
 *
 * Called ONCE when the Next.js server instance boots.
 * Triggers automatic media directory scan and background enrichment
 * so self-hosters get a zero-click, fully automated ingestion on startup.
 *
 * Docs: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
 */

export async function register() {
  // Only run in the Node.js runtime (not Edge). Instrumentation is called
  // for each runtime — guard against the edge invocation which cannot
  // access the filesystem or Prisma.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Allow operators to disable startup scanning (e.g. for CI or testing)
  // by setting AUTO_SCAN_ON_STARTUP=false in their environment.
  if (process.env.AUTO_SCAN_ON_STARTUP === 'false') {
    console.log('[Startup] AUTO_SCAN_ON_STARTUP=false — skipping automatic ingestion.');
    return;
  }

  console.log('[Startup] PerBlinkist server booted — scheduling background media scan...');

  // Kick off the background orchestration without awaiting it.
  // register() returns immediately so Next.js can start serving HTTP traffic,
  // while the ingestion pipeline runs continuously in the background.
  void startBackgroundIngestion();
}

async function startBackgroundIngestion(): Promise<void> {
  // Brief grace period: gives Prisma's connection pool and SQLite file a
  // moment to become ready before we hammer the DB with upserts.
  await new Promise<void>((resolve) => setTimeout(resolve, 3000));

  try {
    // Dynamic import keeps this out of the edge bundle entirely.
    const { runFullOrchestratedIngestion } = await import('./lib/scanner');

    console.log('[Startup] Beginning automatic media scan and enrichment...');
    await runFullOrchestratedIngestion({ autoResumeOnRateLimit: true });
    console.log('[Startup] Background ingestion complete.');
  } catch (err) {
    // Never crash the server over an ingestion failure.
    console.error('[Startup] Background ingestion encountered a fatal error:', err);
  }
}
