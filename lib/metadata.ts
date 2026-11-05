import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

export interface CleanedTitleResult {
  title: string;
  author?: string;
  rawFileName: string;
}

export interface BookMetadataResult {
  title: string;
  author?: string;
  synopsis?: string;
  category?: string;
  coverUrl?: string;
  publisher?: string;
  publishedYear?: number;
  isbn?: string;
  source: 'google_books' | 'open_library' | 'fallback';
}

export class RateLimitError extends Error {
  public retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Persistent Rate Limit & Cooldown Manager
 * Tracks exponential backoff: 1 min (60s) -> 2 mins (120s) -> 3 mins (180s)...
 */
class RateLimiter {
  private cooldownUntil: number = 0;
  private consecutiveLimits: number = 0;
  private lastReason?: string;

  public async init() {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'rate_limit_cooldown_until' },
      });
      if (setting && setting.value) {
        const storedTime = parseInt(setting.value, 10);
        if (storedTime > Date.now()) {
          this.cooldownUntil = storedTime;
        }
      }
    } catch {
      // Best-effort setting read
    }
  }

  public getStatus(): { isRateLimited: boolean; remainingSeconds: number; reason?: string } {
    const now = Date.now();
    if (this.cooldownUntil > now) {
      return {
        isRateLimited: true,
        remainingSeconds: Math.ceil((this.cooldownUntil - now) / 1000),
        reason: this.lastReason,
      };
    }
    return { isRateLimited: false, remainingSeconds: 0 };
  }

  public async triggerRateLimit(reason: string, customSeconds?: number): Promise<number> {
    this.consecutiveLimits++;
    // Backoff ladder: 1 min, 2 min, 3 min (max 15 mins)
    const backoffMinutes = Math.min(this.consecutiveLimits, 15);
    const waitSeconds = customSeconds ?? backoffMinutes * 60;
    this.cooldownUntil = Date.now() + waitSeconds * 1000;
    this.lastReason = reason;

    try {
      await prisma.setting.upsert({
        where: { key: 'rate_limit_cooldown_until' },
        create: {
          key: 'rate_limit_cooldown_until',
          value: this.cooldownUntil.toString(),
        },
        update: {
          value: this.cooldownUntil.toString(),
        },
      });
    } catch {
      // Best effort DB sync
    }

    console.warn(`[RateLimiter] Rate limit triggered: ${reason}. Cooldown for ${waitSeconds} seconds.`);
    return waitSeconds;
  }

  public resetCooldown() {
    this.consecutiveLimits = 0;
    this.cooldownUntil = 0;
    this.lastReason = undefined;
    prisma.setting.delete({ where: { key: 'rate_limit_cooldown_until' } }).catch(() => {});
  }
}

export const rateLimiter = new RateLimiter();
// Initialize from DB
rateLimiter.init().catch(() => {});

/**
 * Clean audio filenames and extract likely title and author.
 */
export function cleanFileName(fileName: string): CleanedTitleResult {
  const ext = path.extname(fileName);
  let baseName = path.basename(fileName, ext).trim();

  // 1. Remove bracketed quality, platform markers, or tags: [Blinkist], (128kbps), etc.
  baseName = baseName.replace(/\[[^\]]*\]/g, ' ');
  baseName = baseName.replace(/\([^)]*(?:kbps|audiobook|summary|blinkist|complete|unabridged)[^)]*\)/gi, ' ');
  baseName = baseName.replace(/\b(?:128|192|256|320)kbps\b/gi, ' ');
  baseName = baseName.replace(/\b(?:mp3|m4a|aac|flac|ogg|mka|opus)\b/gi, ' ');

  // 2. Remove common prefixes like "Summary of", "Book Summary -", etc.
  baseName = baseName.replace(/^\s*(?:summary\s+of|book\s+summary(?:\s*[-:]|\s+of)?)\s+/i, '');
  baseName = baseName.replace(/[_\s]+/g, ' ').trim();

  // 3. Pattern: "<Title> (<Author>)" where (<Author>) is the LAST set of parentheses
  const parenMatch = baseName.match(/^(.*?)\s*\(([^()]+)\)$/);
  if (parenMatch) {
    const candidateTitle = parenMatch[1].trim();
    const candidateAuthor = parenMatch[2].trim();

    if (candidateAuthor.toLowerCase() === 'unknown') {
      return {
        title: candidateTitle,
        author: undefined,
        rawFileName: fileName,
      };
    }

    return {
      title: candidateTitle,
      author: candidateAuthor,
      rawFileName: fileName,
    };
  }

  // 4. Pattern: "<Title> by <Author>" or "<Author> - <Title>"
  const byMatch = baseName.match(/^(.*?)\s+(?:by|-)\s+(.*)$/i);
  if (byMatch) {
    const part1 = byMatch[1].trim();
    const part2 = byMatch[2].trim();

    return {
      title: part1,
      author: part2,
      rawFileName: fileName,
    };
  }

  return {
    title: baseName,
    rawFileName: fileName,
  };
}

/**
 * Fetch book metadata from Google Books API with 429 detection
 */
async function fetchGoogleBooks(query: string, authorHint?: string): Promise<BookMetadataResult | null> {
  const status = rateLimiter.getStatus();
  if (status.isRateLimited) {
    throw new RateLimitError(`Rate limit active. Please wait ${status.remainingSeconds}s`, status.remainingSeconds);
  }

  try {
    let q = `intitle:${encodeURIComponent(query)}`;
    if (authorHint) {
      q += `+inauthor:${encodeURIComponent(authorHint)}`;
    }

    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' },
    });

    if (res.status === 429) {
      const waitSec = await rateLimiter.triggerRateLimit('Google Books API HTTP 429');
      throw new RateLimitError('Google Books API rate limited', waitSec);
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      // Try relaxed query without strict intitle prefix
      let fallbackQ = encodeURIComponent(query);
      if (authorHint) fallbackQ += `+${encodeURIComponent(authorHint)}`;
      const fallbackRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${fallbackQ}&maxResults=3`);
      
      if (fallbackRes.status === 429) {
        const waitSec = await rateLimiter.triggerRateLimit('Google Books API HTTP 429');
        throw new RateLimitError('Google Books API rate limited', waitSec);
      }
      if (!fallbackRes.ok) return null;

      const fallbackData = await fallbackRes.json();
      if (!fallbackData.items || fallbackData.items.length === 0) return null;
      data.items = fallbackData.items;
    }

    const item = data.items[0];
    const info = item.volumeInfo || {};

    let coverUrl =
      info.imageLinks?.extraLarge ||
      info.imageLinks?.large ||
      info.imageLinks?.medium ||
      info.imageLinks?.thumbnail ||
      info.imageLinks?.smallThumbnail;

    if (coverUrl) {
      coverUrl = coverUrl.replace(/^http:\/\//i, 'https://');
    }

    const year = info.publishedDate ? parseInt(info.publishedDate.substring(0, 4), 10) : undefined;
    const isbns = info.industryIdentifiers?.map((i: { identifier: string }) => i.identifier) || [];

    return {
      title: info.title || query,
      author: info.authors ? info.authors.join(', ') : authorHint,
      synopsis: info.description,
      category: info.categories && info.categories.length > 0 ? info.categories[0] : undefined,
      coverUrl,
      publisher: info.publisher,
      publishedYear: typeof year === 'number' && !isNaN(year) ? year : undefined,
      isbn: isbns[0],
      source: 'google_books',
    };
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error('Google Books API fetch failed:', err);
    return null;
  }
}

/**
 * Fetch fallback metadata from Open Library API with 429 detection
 */
async function fetchOpenLibrary(query: string, authorHint?: string): Promise<BookMetadataResult | null> {
  const status = rateLimiter.getStatus();
  if (status.isRateLimited) {
    throw new RateLimitError(`Rate limit active. Please wait ${status.remainingSeconds}s`, status.remainingSeconds);
  }

  try {
    let q = `title=${encodeURIComponent(query)}`;
    if (authorHint) {
      q += `&author=${encodeURIComponent(authorHint)}`;
    }

    const res = await fetch(`https://openlibrary.org/search.json?${q}&limit=2`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' },
    });

    if (res.status === 429) {
      const waitSec = await rateLimiter.triggerRateLimit('Open Library API HTTP 429');
      throw new RateLimitError('Open Library API rate limited', waitSec);
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    const doc = data.docs[0];
    const coverId = doc.cover_i;
    const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;

    return {
      title: doc.title || query,
      author: doc.author_name ? doc.author_name.join(', ') : authorHint,
      synopsis: typeof doc.first_sentence === 'string' ? doc.first_sentence : undefined,
      category: doc.subject && doc.subject.length > 0 ? doc.subject[0] : undefined,
      coverUrl,
      publisher: doc.publisher && doc.publisher.length > 0 ? doc.publisher[0] : undefined,
      publishedYear: doc.first_publish_year,
      isbn: doc.isbn && doc.isbn.length > 0 ? doc.isbn[0] : undefined,
      source: 'open_library',
    };
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error('Open Library API fetch failed:', err);
    return null;
  }
}

/**
 * Download remote cover image and cache it locally in config/cache/covers
 */
export async function cacheCoverImage(bookId: string, remoteUrl: string): Promise<string | null> {
  try {
    const coversDir = path.join(process.cwd(), 'config', 'cache', 'covers');
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }

    const localFileName = `${bookId}.jpg`;
    const localFilePath = path.join(coversDir, localFileName);

    if (fs.existsSync(localFilePath)) {
      return `/api/covers/${localFileName}`;
    }

    const res = await fetch(remoteUrl);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(localFilePath, buffer);

    return `/api/covers/${localFileName}`;
  } catch (err) {
    console.error(`Failed to cache cover image for book ${bookId}:`, err);
    return null;
  }
}

/**
 * Orchestrator: Combines filename parsing, embedded tags hint, Google Books, and Open Library.
 */
export async function resolveBookMetadata(
  fileName: string,
  embeddedHints?: { title?: string; author?: string; genre?: string }
): Promise<BookMetadataResult> {
  const cleaned = cleanFileName(fileName);
  const queryTitle = embeddedHints?.title || cleaned.title;
  const queryAuthor = embeddedHints?.author || cleaned.author;

  // 1. Primary: Google Books
  const googleResult = await fetchGoogleBooks(queryTitle, queryAuthor);
  if (googleResult) {
    return googleResult;
  }

  // 2. Secondary: Open Library
  const openLibraryResult = await fetchOpenLibrary(queryTitle, queryAuthor);
  if (openLibraryResult) {
    return openLibraryResult;
  }

  // 3. Fallback: Cleaned Title & Author with embedded tags
  return {
    title: queryTitle,
    author: queryAuthor,
    category: embeddedHints?.genre,
    source: 'fallback',
  };
}
