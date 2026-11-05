import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const book = await prisma.bookSummary.findUnique({
    where: { id },
  });

  if (!book || !fs.existsSync(book.filePath)) {
    return new NextResponse('Audio file not found', { status: 404 });
  }

  const stat = fs.statSync(book.filePath);
  const fileSize = stat.size;
  const range = req.headers.get('range');
  const ext = path.extname(book.filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'audio/mpeg';

  if (range) {
    // Parse Range Header e.g. "bytes=0-1024"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return new NextResponse('Requested range not satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(book.filePath, { start, end });

    // Stream Partial Content (206)
    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': contentType,
      },
    });
  }

  // Fallback: Full audio stream (200)
  const fullStream = fs.createReadStream(book.filePath);
  return new NextResponse(fullStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
    },
  });
}
