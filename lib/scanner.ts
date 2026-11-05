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
 * Scan a target media directory, read embedded audio tags, resolve metadata from APIs, and save to SQLite
 */
export async function runMediaScan(mediaDirectory?: string): Promise<ScanProgress> {
  const targetDir = mediaDirectory || (fs.existsSync(path.join(process.cwd(), 'example-files'))
    ? path.join(process.cwd(), 'example-files')
    : path.join(process.cwd(), 'media'));

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
        const ext = path.extname(filePath).replace('.', '').toLowerCase();

        // Check if already indexed with matching size
        const existing = await prisma.bookSummary.findUnique({
          where: { filePath },
        });

        if (existing && existing.fileSize === stats.size && existing.isEnriched) {
          // Already enriched, skip re-scraping
          continue;
        }

        // 1. Extract audio format, duration, bitrate, and embedded tags
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

          // Matroska / ID3 / Vorbis embedded tags
          embeddedTitle = parsed.common.title || parsed.format.trackInfo?.[0]?.name;
          embeddedAuthor = parsed.common.artist || parsed.common.artists?.[0];
          embeddedGenre = parsed.common.genre?.[0];
        } catch (audioErr) {
          console.warn(`Could not parse audio header for ${fileName}:`, audioErr);
        }

        // 2. Resolve metadata from Google Books / Open Library using filename + embedded tags
        const bookMeta = await resolveBookMetadata(fileName, {
          title: embeddedTitle,
          author: embeddedAuthor,
          genre: embeddedGenre,
        });

        // 3. Save or update record in Prisma
        const savedBook = await prisma.bookSummary.upsert({
          where: { filePath },
          update: {
            fileSize: stats.size,
            format: ext,
            codec,
            bitrate,
            embeddedTitle,
            embeddedAuthor,
            title: bookMeta.title,
            author: bookMeta.author,
            synopsis: bookMeta.synopsis,
            category: bookMeta.category || embeddedGenre || 'General',
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
            format: ext,
            codec,
            bitrate,
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

        // 4. Cache cover image locally
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
        console.error(`Error processing file ${filePath}:`, fileErr);
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
