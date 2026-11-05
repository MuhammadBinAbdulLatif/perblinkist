import fs from 'fs';
import path from 'path';

/**
 * Resolve persistent config directory.
 * Docker: CONFIG_DIR=/config (volume mount)
 * Local:  ./config under the project root
 */
export function getConfigDir(): string {
  return process.env.CONFIG_DIR || path.join(process.cwd(), 'config');
}

/** Local cover image cache directory */
export function getCoversDir(): string {
  return path.join(getConfigDir(), 'cache', 'covers');
}

/**
 * Resolve the media library directory.
 * Docker: MEDIA_DIR=/media (usually mounted read-only)
 * Local:  example-files/ if present, otherwise ./media
 */
export function getMediaDir(override?: string): string {
  if (override) return override;
  if (process.env.MEDIA_DIR) return process.env.MEDIA_DIR;

  const exampleDir = path.join(process.cwd(), 'example-files');
  if (fs.existsSync(exampleDir)) return exampleDir;

  return path.join(process.cwd(), 'media');
}
