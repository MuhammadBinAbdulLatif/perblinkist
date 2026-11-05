import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import { prisma } from './prisma';
import { resolveBookMetadata, cacheCoverImage, rateLimiter, RateLimitError } from './metadata';

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
  const enrichRes = await processBatchEnrichment(10);
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
  const targetDir =
    mediaDirectory ||
    (fs.existsSync(path.join(process.cwd(), 'example-files'))
      ? path.join(process.cwd(), 'example-files')
      : path.join(process.cwd(), 'media'));

  if (!fs.existsSync(targetDir)) {
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
 * Stage 2: Controlled Batch Enrichment (10 items per cycle)
 * Pulls up to `batchSize` (default 10) records needing metadata.
 * Detects rate-limits and halts gracefully with retry counters.
 */
export async function processBatchEnrichment(batchSize: number = 10): Promise<{
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

  // Pick up to batchSize items that need enrichment
  const booksToEnrich = await prisma.bookSummary.findMany({
    where: {
      isMissing: false,
      enrichmentStatus: { in: ['pending', 'rate_limited', 'failed'] },
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

  activeStats.status = 'enriching';
  activeStats.batchSize = batchSize;
  let enrichedCount = 0;
  let rateLimitHit = false;
  let cooldownSec = 0;

  for (const book of booksToEnrich) {
    activeStats.currentFile = book.fileName;
    try {
      // Gentle micro-delay between requests (300ms) to avoid instantaneous burst 429s
      await new Promise((resolve) => setTimeout(resolve, 300));

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
        rateLimitHit = true;
        cooldownSec = err.retryAfterSeconds;

        // Flag current book and remaining as rate_limited
        await prisma.bookSummary.update({
          where: { id: book.id },
          data: {
            enrichmentStatus: 'rate_limited',
            enrichmentError: err.message,
            retryCount: { increment: 1 },
          },
        });
        break; // Stop current batch immediately
      } else {
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
    }
  }

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
    processed: booksToEnrich.length,
    enriched: enrichedCount,
    rateLimited: rateLimitHit,
    remainingPending,
    cooldownSeconds: rateLimitHit ? cooldownSec : undefined,
  };
}

/**
 * Continuous Batch Orchestrator
 * Runs indexing, then automatically processes 10 items at a time.
 * If rate limit is encountered, it pauses for the cooldown period (1 min, 2 min, etc.)
 * then resumes seamlessly.
 */
let isOrchestratorRunning = false;

export async function runFullOrchestratedIngestion(options?: {
  mediaDirectory?: string;
  maxBatches?: number;
}): Promise<DetailedScanStats> {
  if (isOrchestratorRunning) {
    return getDetailedScanStats();
  }

  isOrchestratorRunning = true;
  const startTime = Date.now();

  try {
    // 1. Fast Index all local files
    await fastIndexMediaDirectory(options?.mediaDirectory);

    // 2. Loop in batches of 10
    let batchIndex = 0;
    const maxBatches = options?.maxBatches || 10000; // supports up to 100,000 files

    while (batchIndex < maxBatches) {
      batchIndex++;
      activeStats.currentBatch = batchIndex;

      const batchResult = await processBatchEnrichment(10);

      if (batchResult.rateLimited) {
        console.warn(`[Batch Orchestrator] Rate limit hit during batch ${batchIndex}. Pausing worker...`);
        // We pause and exit the active loop so server doesn't spin; UI or cron resumes when cooldown ends
        break;
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
