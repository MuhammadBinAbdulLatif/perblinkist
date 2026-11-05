import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import { prisma } from './prisma';
import { resolveBookMetadata, cacheCoverImage, rateLimiter, RateLimitError } from './metadata';
import { getMediaDir } from './paths';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.wav', '.mka']);

export interface DetailedScanStats {
  status: 'idle' | 'indexing' | 'enriching' | 'completed' | 'rate_limited' | 'error';
  totalFound: number;
  totalIndexed: number;
  totalEnriched: number;
  totalPending: number;
  totalRateLimited: number;
  totalFailed: number;
  currentBatch: number;
  batchSize: number;
  currentFile?: string;
  isRateLimited: boolean;
  rateLimitRemainingSeconds: number;
  rateLimitReason?: string;
  durationMs: number;
}

let activeStats: DetailedScanStats = {
  status: 'idle',
  totalFound: 0,
  totalIndexed: 0,
  totalEnriched: 0,
  totalPending: 0,
  totalRateLimited: 0,
  totalFailed: 0,
  currentBatch: 0,
  batchSize: 10,
  isRateLimited: false,
  rateLimitRemainingSeconds: 0,
  durationMs: 0,
};

export async function getDetailedScanStats(): Promise<DetailedScanStats> {
  const rl = rateLimiter.getStatus();
  activeStats.isRateLimited = rl.isRateLimited;
  activeStats.rateLimitRemainingSeconds = rl.remainingSeconds;
  activeStats.rateLimitReason = rl.reason;

  // Query actual counts from database to always ensure accurate truth
  try {
    const [indexed, enriched, pending, rateLimited, failed] = await Promise.all([
      prisma.bookSummary.count({ where: { isMissing: false } }),
      prisma.bookSummary.count({ where: { isMissing: false, enrichmentStatus: 'enriched' } }),
      prisma.bookSummary.count({ where: { isMissing: false, enrichmentStatus: 'pending' } }),
      prisma.bookSummary.count({ where: { isMissing: false, enrichmentStatus: 'rate_limited' } }),
      prisma.bookSummary.count({ where: { isMissing: false, enrichmentStatus: 'failed' } }),
    ]);

    activeStats.totalIndexed = indexed;
    activeStats.totalEnriched = enriched;
    activeStats.totalPending = pending;
    activeStats.totalRateLimited = rateLimited;
    activeStats.totalFailed = failed;
  } catch {
    // Best-effort database query
  }

  return activeStats;
}

// Backward-compatible alias for existing test scripts
export interface ScanProgress {
  status: 'idle' | 'scanning' | 'completed' | 'error';
  totalFound: number;
  processed: number;
  unchanged: number;
  newAdded: number;
  modified: number;
  removed: number;
  errors: number;
  durationMs: number;
  currentFile?: string;
}

export async function runMediaScan(
  mediaDirectory?: string,
  _options?: { pruneMissing?: boolean }
): Promise<ScanProgress> {
  const start = Date.now();
  const indexRes = await fastIndexMediaDirectory(mediaDirectory);
  const enrichRes = await processBatchEnrichment(getEnrichBatchSize());
  const stats = await getDetailedScanStats();

  return {
    status: 'completed',
    totalFound: indexRes.totalFiles,
    processed: indexRes.newIndexed + indexRes.updated,
    unchanged: indexRes.totalFiles - (indexRes.newIndexed + indexRes.updated),
    newAdded: indexRes.newIndexed,
    modified: indexRes.updated,
    removed: indexRes.missing,
    errors: stats.totalFailed,
    durationMs: Date.now() - start,
  };
}

/**
 * Recursively find all supported audio files in a directory
 */
export function findAudioFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAudioFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

/**
 * Stage 1: Fast Disk Indexing
 * Rapidly crawls media directory, reads audio technical tags (Matroska/ID3/Vorbis),
 * registers/updates files in SQLite, and marks new/modified items as 'pending' for enrichment.
 * Performs ZERO external network calls.
 */
export async function fastIndexMediaDirectory(mediaDirectory?: string): Promise<{
  totalFiles: number;
  newIndexed: number;
  updated: number;
  missing: number;
}> {
  const targetDir = getMediaDir(mediaDirectory);

  if (!fs.existsSync(targetDir)) {
    // Never mkdir a Docker MEDIA_DIR mount (often read-only). Only create
    // the local-dev fallback directory when MEDIA_DIR is unset.
    if (process.env.MEDIA_DIR) {
      throw new Error(
        `MEDIA_DIR does not exist or is not mounted: ${targetDir}`
      );
    }
    fs.mkdirSync(targetDir, { recursive: true });
  }

  activeStats.status = 'indexing';
  const audioFiles = findAudioFiles(targetDir);
  activeStats.totalFound = audioFiles.length;
  const filesOnDisk = new Set(audioFiles);

  const existingRecords = await prisma.bookSummary.findMany({
    select: {
      id: true,
      filePath: true,
      fileSize: true,
      fileMtime: true,
      enrichmentStatus: true,
      isMissing: true,
    },
  });

  const existingMap = new Map(existingRecords.map((r) => [r.filePath, r]));
  let newIndexed = 0;
  let updated = 0;

  for (const filePath of audioFiles) {
    activeStats.currentFile = path.basename(filePath);
    try {
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).replace('.', '').toLowerCase();
      const mtime = new Date(Math.floor(stats.mtimeMs));

      const existing = existingMap.get(filePath);

      // If unchanged file and not missing, skip parsing
      if (
        existing &&
        existing.fileSize === stats.size &&
        existing.fileMtime &&
        Math.abs(existing.fileMtime.getTime() - mtime.getTime()) < 1000
      ) {
        if (existing.isMissing) {
          await prisma.bookSummary.update({
            where: { id: existing.id },
            data: { isMissing: false },
          });
        }
        continue;
      }

      // Parse audio tags locally
      let durationSeconds: number | undefined;
      let codec: string | undefined;
      let bitrate: number | undefined;
      let embeddedTitle: string | undefined;
      let embeddedAuthor: string | undefined;
      let embeddedGenre: string | undefined;

      try {
        const parsed = await parseFile(filePath, { duration: true, skipCovers: true });
        durationSeconds = parsed.format.duration;
        codec = parsed.format.codec;
        bitrate = parsed.format.bitrate ? Math.round(parsed.format.bitrate) : undefined;
        embeddedTitle = parsed.common.title || parsed.format.trackInfo?.[0]?.name;
        embeddedAuthor = parsed.common.artist || parsed.common.artists?.[0];
        embeddedGenre = parsed.common.genre?.[0];
      } catch {
        // Fallback to basic file info
      }

      const initialTitle = embeddedTitle || fileName.replace(/\.[^/.]+$/, '');

      await prisma.bookSummary.upsert({
        where: { filePath },
        update: {
          fileSize: stats.size,
          fileMtime: mtime,
          format: ext,
          codec,
          bitrate,
          durationSeconds,
          embeddedTitle,
          embeddedAuthor,
          category: embeddedGenre || 'General',
          isMissing: false,
          indexingStatus: 'indexed',
          // If already enriched and only timestamps touched, keep status, else pending
          enrichmentStatus: existing?.enrichmentStatus === 'enriched' ? 'enriched' : 'pending',
        },
        create: {
          filePath,
          fileName,
          title: initialTitle,
          author: embeddedAuthor,
          fileSize: stats.size,
          fileMtime: mtime,
          format: ext,
          codec,
          bitrate,
          durationSeconds,
          embeddedTitle,
          embeddedAuthor,
          category: embeddedGenre || 'General',
          isMissing: false,
          indexingStatus: 'indexed',
          enrichmentStatus: 'pending',
        },
      });

      if (existing) {
        updated++;
      } else {
        newIndexed++;
      }
    } catch (err) {
      console.error(`[Indexer] Failed to index ${filePath}:`, err);
    }
  }

  // Mark missing files
  let missing = 0;
  for (const record of existingRecords) {
    if (!filesOnDisk.has(record.filePath) && !record.isMissing) {
      await prisma.bookSummary.update({
        where: { id: record.id },
        data: { isMissing: true },
      });
      missing++;
    }
  }

  activeStats.status = 'idle';
  activeStats.currentFile = undefined;
  await getDetailedScanStats();

  return { totalFiles: audioFiles.length, newIndexed, updated, missing };
}

/**
 * Parallelism for metadata enrichment. Override with ENRICH_CONCURRENCY (1–8).
 * Kept modest so SQLite writes and upstream APIs stay stable.
 */
export function getEnrichConcurrency(): number {
  const raw = Number.parseInt(process.env.ENRICH_CONCURRENCY || '5', 10);
  if (Number.isNaN(raw)) return 5;
  return Math.min(8, Math.max(1, raw));
}

/** Default batch size sized to feed the concurrency pool for a few waves. */
export function getEnrichBatchSize(): number {
  return Math.min(50, Math.max(10, getEnrichConcurrency() * 4));
}

/**
 * Run async work over items with a fixed worker-pool size.
 * `shouldStop` prevents picking up new items (in-flight work still finishes).
 */
async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
  shouldStop?: () => boolean
): Promise<void> {
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      if (shouldStop?.()) return;
      const index = nextIndex++;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  }

  const poolSize = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
}

/**
 * Stage 2: Controlled Batch Enrichment
 * Pulls up to `batchSize` records needing metadata and enriches them with a
 * small concurrency pool. On RateLimitError, stops scheduling new work and
 * lets in-flight workers finish.
 */
export async function processBatchEnrichment(batchSize: number = getEnrichBatchSize()): Promise<{
  processed: number;
  enriched: number;
  rateLimited: boolean;
  remainingPending: number;
  cooldownSeconds?: number;
}> {
  // Check if server is currently in rate limit cooldown
  const rl = rateLimiter.getStatus();
  if (rl.isRateLimited) {
    activeStats.status = 'rate_limited';
    activeStats.isRateLimited = true;
    activeStats.rateLimitRemainingSeconds = rl.remainingSeconds;
    activeStats.rateLimitReason = rl.reason;
    const remainingPending = await prisma.bookSummary.count({
      where: { isMissing: false, enrichmentStatus: { in: ['pending', 'rate_limited'] } },
    });
    return {
      processed: 0,
      enriched: 0,
      rateLimited: true,
      remainingPending,
      cooldownSeconds: rl.remainingSeconds,
    };
  }

  // Cooldown has cleared — reset any 'rate_limited' books back to 'pending' so they get retried
  await prisma.bookSummary.updateMany({
    where: { isMissing: false, enrichmentStatus: 'rate_limited' },
    data: { enrichmentStatus: 'pending' },
  });

  // Pick up to batchSize items that need enrichment.
  // 'failed' books are retried up to MAX_RETRY_COUNT times only — prevents
  // permanently-unresolvable titles from wasting API quota on every boot.
  const MAX_RETRY_COUNT = 3;
  const booksToEnrich = await prisma.bookSummary.findMany({
    where: {
      isMissing: false,
      OR: [
        { enrichmentStatus: { in: ['pending', 'rate_limited'] } },
        { enrichmentStatus: 'failed', retryCount: { lt: MAX_RETRY_COUNT } },
      ],
    },
    take: batchSize,
    orderBy: [{ retryCount: 'asc' }, { updatedAt: 'asc' }],
  });

  if (booksToEnrich.length === 0) {
    activeStats.status = 'completed';
    return {
      processed: 0,
      enriched: 0,
      rateLimited: false,
      remainingPending: 0,
    };
  }

  const concurrency = getEnrichConcurrency();
  activeStats.status = 'enriching';
  activeStats.batchSize = batchSize;

  let enrichedCount = 0;
  let processedCount = 0;
  let rateLimitHit = false;
  let cooldownSec = 0;
  let stopScheduling = false;

  // Dynamic inter-request delay: shorter with an API key, more cautious without
  const requestDelay = process.env.GOOGLE_BOOKS_API_KEY ? 100 : 500;

  await mapWithConcurrency(
    booksToEnrich,
    concurrency,
    async (book) => {
      // Double-check after taking a slot — another worker may have tripped the limit
      if (stopScheduling) return;

      processedCount++;
      activeStats.currentFile = book.fileName;

      try {
        await new Promise<void>((resolve) => setTimeout(resolve, requestDelay));

        // Abort after delay if a sibling worker hit the rate limit while we waited
        if (stopScheduling) return;

        const bookMeta = await resolveBookMetadata(book.fileName, {
          title: book.embeddedTitle || undefined,
          author: book.embeddedAuthor || undefined,
          genre: book.category || undefined,
        });

        let localCover: string | null = book.localCoverPath;
        if (bookMeta.coverUrl && !localCover) {
          localCover = await cacheCoverImage(book.id, bookMeta.coverUrl);
        }

        await prisma.bookSummary.update({
          where: { id: book.id },
          data: {
            title: bookMeta.title,
            author: bookMeta.author,
            synopsis: bookMeta.synopsis,
            category: bookMeta.category || book.category || 'General',
            publisher: bookMeta.publisher,
            publishedYear: bookMeta.publishedYear,
            isbn: bookMeta.isbn,
            coverUrl: bookMeta.coverUrl,
            localCoverPath: localCover,
            matchedSource: bookMeta.source,
            isEnriched: bookMeta.source !== 'fallback',
            enrichmentStatus: 'enriched',
            enrichmentError: null,
            enrichedAt: new Date(),
          },
        });

        enrichedCount++;
      } catch (err) {
        if (err instanceof RateLimitError) {
          // Stop new work; in-flight siblings finish or also land here
          stopScheduling = true;
          rateLimitHit = true;
          cooldownSec = Math.max(cooldownSec, err.retryAfterSeconds);

          await prisma.bookSummary.update({
            where: { id: book.id },
            data: {
              enrichmentStatus: 'rate_limited',
              enrichmentError: err.message,
              retryCount: { increment: 1 },
            },
          });
          return;
        }

        const errorMsg = err instanceof Error ? err.message : String(err);
        await prisma.bookSummary.update({
          where: { id: book.id },
          data: {
            enrichmentStatus: 'failed',
            enrichmentError: errorMsg,
            retryCount: { increment: 1 },
          },
        });
      }
    },
    () => stopScheduling
  );

  if (rateLimitHit) {
    activeStats.status = 'rate_limited';
    activeStats.isRateLimited = true;
    activeStats.rateLimitRemainingSeconds = cooldownSec;
  } else {
    activeStats.status = 'idle';
  }

  activeStats.currentFile = undefined;
  const remainingPending = await prisma.bookSummary.count({
    where: { isMissing: false, enrichmentStatus: { in: ['pending', 'rate_limited'] } },
  });

  await getDetailedScanStats();

  return {
    processed: processedCount,
    enriched: enrichedCount,
    rateLimited: rateLimitHit,
    remainingPending,
    cooldownSeconds: rateLimitHit ? cooldownSec : undefined,
  };
}

/**
 * Continuous Batch Orchestrator
 * Runs indexing, then enriches in concurrent batches.
 * If rate limit is encountered, it pauses for the cooldown period then resumes.
 */
let isOrchestratorRunning = false;

export async function runFullOrchestratedIngestion(options?: {
  mediaDirectory?: string;
  maxBatches?: number;
  autoResumeOnRateLimit?: boolean;
}): Promise<DetailedScanStats> {
  if (isOrchestratorRunning) {
    return getDetailedScanStats();
  }

  isOrchestratorRunning = true;
  const startTime = Date.now();
  const batchSize = getEnrichBatchSize();
  const concurrency = getEnrichConcurrency();

  try {
    // 1. Fast Index all local files
    await fastIndexMediaDirectory(options?.mediaDirectory);

    // 2. Loop in concurrent batches
    let batchIndex = 0;
    const maxBatches = options?.maxBatches || 10000; // supports up to 100,000 files
    // Default: auto-resume enabled unless explicitly disabled
    const autoResume = options?.autoResumeOnRateLimit !== false;

    console.log(
      `[Batch Orchestrator] Enriching with concurrency=${concurrency}, batchSize=${batchSize}`
    );

    while (batchIndex < maxBatches) {
      batchIndex++;
      activeStats.currentBatch = batchIndex;

      const batchResult = await processBatchEnrichment(batchSize);

      if (batchResult.rateLimited) {
        if (autoResume) {
          const sleepMs = ((batchResult.cooldownSeconds ?? 60) + 5) * 1000;
          console.log(
            `[Batch Orchestrator] Rate limited on batch ${batchIndex}. ` +
              `Sleeping ${Math.round(sleepMs / 1000)}s then resuming...`
          );
          activeStats.status = 'rate_limited';
          // Release the lock while sleeping so the UI can still query status
          isOrchestratorRunning = false;
          await new Promise((resolve) => setTimeout(resolve, sleepMs));
          isOrchestratorRunning = true;
          continue; // resume the batch loop
        } else {
          console.warn(
            `[Batch Orchestrator] Rate limit hit during batch ${batchIndex}. Pausing worker...`
          );
          // Pause and exit the active loop so server doesn't spin; UI or cron resumes when cooldown ends
          break;
        }
      }

      if (batchResult.remainingPending === 0) {
        console.log(`[Batch Orchestrator] All books successfully enriched!`);
        activeStats.status = 'completed';
        break;
      }
    }
  } catch (fatalErr) {
    console.error('[Batch Orchestrator] Fatal error:', fatalErr);
    activeStats.status = 'error';
  } finally {
    isOrchestratorRunning = false;
    activeStats.durationMs = Date.now() - startTime;
  }

  return getDetailedScanStats();
}
