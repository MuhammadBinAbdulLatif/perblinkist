import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCoversDir } from '@/lib/paths';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const { fileName } = await params;
  const sanitized = path.basename(fileName);
  const filePath = path.join(getCoversDir(), sanitized);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Cover not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
