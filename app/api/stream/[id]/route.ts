import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';

const MIME_MAP: Record<string, string> = {
  '.mka': 'audio/webm; codecs=opus',
  '.opus': 'audio/ogg; codecs=opus',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
};

/**
 * Resolve audio file location across local development and Docker volume mounts
 */
export function resolveAudioPath(storedPath: string): string | null {
  // 1. Direct path exists
  if (fs.existsSync(storedPath)) return storedPath;

  // 2. Check MEDIA_DIR or /media
  const mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
  const candidateInMedia = path.join(mediaDir, path.basename(storedPath));
  if (fs.existsSync(candidateInMedia)) return candidateInMedia;

  // 3. Check example-files
  const exampleCandidate = path.join(process.cwd(), 'example-files', path.basename(storedPath));
  if (fs.existsSync(exampleCandidate)) return exampleCandidate;

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const book = await prisma.bookSummary.findUnique({
    where: { id },
  });

  if (!book) {
    return new NextResponse('Audiobook summary not found in catalog', { status: 404 });
  }

  const realFilePath = resolveAudioPath(book.filePath);
  if (!realFilePath || !fs.existsSync(realFilePath)) {
    return new NextResponse('Audio media file not found on storage', { status: 404 });
  }

  const stat = fs.statSync(realFilePath);
  const fileSize = stat.size;
  const ext = path.extname(realFilePath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'audio/webm; codecs=opus';

  const range = req.headers.get('range');

  if (range) {
    // Standard RFC 7233 Range parser: "bytes=0-1024" or "bytes=1024-"
    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return new NextResponse('Invalid Range format', { status: 400 });
    }

    const rawStart = match[1];
    const rawEnd = match[2];

    const start = rawStart ? parseInt(rawStart, 10) : 0;
    const end = rawEnd ? parseInt(rawEnd, 10) : fileSize - 1;

    // Check bounds
    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse('Requested range not satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
          'Accept-Ranges': 'bytes',
        },
      });
    }

    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(realFilePath, { start, end });
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Full file stream (HTTP 200)
  const nodeStream = fs.createReadStream(realFilePath);
  const webStream = Readable.toWeb(nodeStream);

  return new NextResponse(webStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    },
  });
}
