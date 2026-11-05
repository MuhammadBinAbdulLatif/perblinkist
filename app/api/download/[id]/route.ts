import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { resolveAudioPath } from '@/lib/audio';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const book = await prisma.bookSummary.findUnique({
    where: { id },
  });

  if (!book) {
    return new NextResponse('Audiobook summary not found', { status: 404 });
  }

  const realFilePath = resolveAudioPath(book.filePath);
  if (!realFilePath || !fs.existsSync(realFilePath)) {
    return new NextResponse('Audio media file not found on storage', { status: 404 });
  }

  const stat = fs.statSync(realFilePath);
  const ext = path.extname(realFilePath);
  const downloadFileName = `${book.title}${book.author ? ` - ${book.author}` : ''}${ext}`.replace(/[\\/:*?"<>|]/g, '');

  const nodeStream = fs.createReadStream(realFilePath);
  const webStream = Readable.toWeb(nodeStream);

  return new NextResponse(webStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
    },
  });
}
