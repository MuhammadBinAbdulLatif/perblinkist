import fs from 'fs';
import path from 'path';
import { getMediaDir } from './paths';

/**
 * Resolve audio file location across local development and Docker volume mounts
 */
export function resolveAudioPath(storedPath: string): string | null {
  // 1. Direct path exists
  if (fs.existsSync(storedPath)) return storedPath;

  // 2. Check MEDIA_DIR / local media / example-files
  const mediaDir = getMediaDir();
  const candidateInMedia = path.join(mediaDir, path.basename(storedPath));
  if (fs.existsSync(candidateInMedia)) return candidateInMedia;

  // 3. Check example-files when MEDIA_DIR pointed elsewhere
  const exampleCandidate = path.join(process.cwd(), 'example-files', path.basename(storedPath));
  if (fs.existsSync(exampleCandidate)) return exampleCandidate;

  return null;
}
