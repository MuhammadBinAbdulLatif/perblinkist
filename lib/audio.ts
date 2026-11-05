import fs from 'fs';
import path from 'path';

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
