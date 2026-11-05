import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import { prisma } from './prisma';
import { resolveBookMetadata, cacheCoverImage } from './metadata';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.wav']);

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'completed' | 'error';
  totalFound: number;
  processed: number;
  newAdded: number;
  errors: number;
  currentFile?: string;
}

let activeScan: ScanProgress = {
  status: 'idle',
  totalFound: 0,
  processed: 0,
  newAdded: 0,
  errors: 0,
};

export function getScanStatus(): ScanProgress {
  return activeScan;
}

/**
 * Recursively find all supported audio files in a directory
 */
function findAudioFiles(dir: string, fileList: string[] = []): string[] {
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
 * Scan the media directory, detect new/modified files, fetch metadata, and persist to Prisma
 */
export async function runMediaScan(mediaDirectory?: string): Promise<ScanProgress> {
  const targetDir = mediaDirectory || path.join(process.cwd(), 'media');

  if (activeScan.status === 'scanning') {
    return activeScan;
  }

  activeScan = {
    status: 'scanning',
    totalFound: 0,
    processed: 0,
    newAdded: 0,
    errors: 0,
  };

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const audioFiles = findAudioFiles(targetDir);
    activeScan.totalFound = audioFiles.length;

    for (const filePath of audioFiles) {
      activeScan.currentFile = path.basename(filePath);
      activeScan.processed++;

      try {
        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);

        // Check if already indexed with matching size/mtime
        const existing = await prisma.bookSummary.findUnique({
          where: { filePath },
        });

        if (existing && existing.fileSize === stats.size) {
          // File already indexed and unchanged, skip heavy metadata re-fetching
          continue;
        }

        // 1. Extract audio duration via music-metadata
        let durationSeconds: number | undefined;
        try {
          const metadata = await parseFile(filePath, { duration: true, skipCovers: true });
          durationSeconds = metadata.format.duration;
        } catch {
          // Ignore audio parse failures and fallback
        }

        // 2. Resolve metadata from Google Books / Open Library
        const bookMeta = await resolveBookMetadata(fileName);

        // 3. Save or update record in Prisma
        const savedBook = await prisma.bookSummary.upsert({
          where: { filePath },
          update: {
            fileSize: stats.size,
            title: bookMeta.title,
            author: bookMeta.author,
            synopsis: bookMeta.synopsis,
            category: bookMeta.category || 'General',
            durationSeconds: durationSeconds ?? existing?.durationSeconds,
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
            title: bookMeta.title,
            author: bookMeta.author,
            synopsis: bookMeta.synopsis,
            category: bookMeta.category || 'General',
            durationSeconds,
            publisher: bookMeta.publisher,
            publishedYear: bookMeta.publishedYear,
            isbn: bookMeta.isbn,
            matchedSource: bookMeta.source,
            isEnriched: bookMeta.source !== 'fallback',
          },
        });

        // 4. Cache cover locally if remote URL is available
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

        activeScan.newAdded++;
      } catch (fileErr) {
        console.error(`Error indexing file ${filePath}:`, fileErr);
        activeScan.errors++;
      }
    }

    activeScan.status = 'completed';
    activeScan.currentFile = undefined;
    return activeScan;
  } catch (err) {
    console.error('Fatal scan error:', err);
    activeScan.status = 'error';
    return activeScan;
  }
}
