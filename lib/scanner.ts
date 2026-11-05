import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import { prisma } from './prisma';
import { resolveBookMetadata, cacheCoverImage } from './metadata';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.wav', '.mka']);

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

let activeScan: ScanProgress = {
  status: 'idle',
  totalFound: 0,
  processed: 0,
  unchanged: 0,
  newAdded: 0,
  modified: 0,
  removed: 0,
  errors: 0,
  durationMs: 0,
};

export function getScanStatus(): ScanProgress {
  return activeScan;
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

export interface MediaScanOptions {
  pruneMissing?: boolean;
}

/**
 * Perform incremental media scan:
 * 1. Checks file existence and compares size + mtime in a single batch.
 * 2. Skips unchanged files with zero external API calls.
 * 3. Only processes newly added or modified files.
 * 4. Identifies or prunes removed files.
 */
export async function runMediaScan(
  mediaDirectory?: string,
  options: MediaScanOptions = { pruneMissing: false }
): Promise<ScanProgress> {
  const startTime = Date.now();
  const targetDir =
    mediaDirectory ||
    (fs.existsSync(path.join(process.cwd(), 'example-files'))
      ? path.join(process.cwd(), 'example-files')
      : path.join(process.cwd(), 'media'));

  if (activeScan.status === 'scanning') {
    return activeScan;
  }

  activeScan = {
    status: 'scanning',
    totalFound: 0,
    processed: 0,
    unchanged: 0,
    newAdded: 0,
    modified: 0,
    removed: 0,
    errors: 0,
    durationMs: 0,
  };

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Detect all audio files on disk
    const audioFiles = findAudioFiles(targetDir);
    activeScan.totalFound = audioFiles.length;
    const filesOnDisk = new Set(audioFiles);

    // 2. Fetch existing records in one query to avoid N round-trips
    const existingRecords = await prisma.bookSummary.findMany({
      select: {
        id: true,
        filePath: true,
        fileSize: true,
        fileMtime: true,
        isEnriched: true,
        isMissing: true,
        localCoverPath: true,
      },
    });

    const existingMap = new Map(existingRecords.map((r) => [r.filePath, r]));

    // 3. Process files on disk
    for (const filePath of audioFiles) {
      activeScan.currentFile = path.basename(filePath);
      activeScan.processed++;

      try {
        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).replace('.', '').toLowerCase();
        const mtime = new Date(Math.floor(stats.mtimeMs));

        const existing = existingMap.get(filePath);

        // Check if file is completely unchanged
        if (
          existing &&
          existing.fileSize === stats.size &&
          existing.fileMtime &&
          Math.abs(existing.fileMtime.getTime() - mtime.getTime()) < 1000
        ) {
          // If it was previously marked missing, unmark it
          if (existing.isMissing) {
            await prisma.bookSummary.update({
              where: { id: existing.id },
              data: { isMissing: false },
            });
          }
          activeScan.unchanged++;
          continue; // Zero external API calls!
        }

        const isModification = Boolean(existing);

        // Extract technical audio info
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
          // Audio header parse warning ignored
        }

        // Only query external APIs for new or modified files
        const bookMeta = await resolveBookMetadata(fileName, {
          title: embeddedTitle,
          author: embeddedAuthor,
          genre: embeddedGenre,
        });

        const savedBook = await prisma.bookSummary.upsert({
          where: { filePath },
          update: {
            fileSize: stats.size,
            fileMtime: mtime,
            format: ext,
            codec,
            bitrate,
            isMissing: false,
            embeddedTitle,
            embeddedAuthor,
            title: bookMeta.title,
            author: bookMeta.author,
            synopsis: bookMeta.synopsis,
            category: bookMeta.category || embeddedGenre || 'General',
            durationSeconds,
            publisher: bookMeta.publisher,
            publishedYear: bookMeta.publishedYear,
            isbn: bookMeta.isbn,
            matchedSource: bookMeta.source,
            isEnriched: bookMeta.source !== 'fallback',
          },
          create: {
            filePath,
            fileName,
            fileSize: stats.size,
            fileMtime: mtime,
            format: ext,
            codec,
            bitrate,
            isMissing: false,
            embeddedTitle,
            embeddedAuthor,
            title: bookMeta.title,
            author: bookMeta.author,
            synopsis: bookMeta.synopsis,
            category: bookMeta.category || embeddedGenre || 'General',
            durationSeconds,
            publisher: bookMeta.publisher,
            publishedYear: bookMeta.publishedYear,
            isbn: bookMeta.isbn,
            matchedSource: bookMeta.source,
            isEnriched: bookMeta.source !== 'fallback',
          },
        });

        // Cache cover if not cached
        if (bookMeta.coverUrl && !savedBook.localCoverPath) {
          const localCover = await cacheCoverImage(savedBook.id, bookMeta.coverUrl);
          if (localCover) {
            await prisma.bookSummary.update({
              where: { id: savedBook.id },
              data: {
                coverUrl: bookMeta.coverUrl,
                localCoverPath: localCover,
              },
            });
          }
        }

        if (isModification) {
          activeScan.modified++;
        } else {
          activeScan.newAdded++;
        }
      } catch (fileErr) {
        console.error(`Error processing file ${filePath}:`, fileErr);
        activeScan.errors++;
      }
    }

    // 4. Identify deleted / missing files
    for (const record of existingRecords) {
      if (!filesOnDisk.has(record.filePath)) {
        if (options.pruneMissing) {
          await prisma.bookSummary.delete({ where: { id: record.id } });
          activeScan.removed++;
        } else if (!record.isMissing) {
          await prisma.bookSummary.update({
            where: { id: record.id },
            data: { isMissing: true },
          });
          activeScan.removed++;
        }
      }
    }

    activeScan.status = 'completed';
    activeScan.currentFile = undefined;
    activeScan.durationMs = Date.now() - startTime;
    return activeScan;
  } catch (err) {
    console.error('Fatal scan error:', err);
    activeScan.status = 'error';
    activeScan.durationMs = Date.now() - startTime;
    return activeScan;
  }
}
