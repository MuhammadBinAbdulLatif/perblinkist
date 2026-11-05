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
  source: 'google_books' | 'open_library' | 'crossref' | 'wikipedia' | 'merged' | 'fallback';
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
 * Per-provider in-memory rate limiter.
 * A 429 from Google Books only silences Google Books — Open Library and Wikipedia
 * have independent quotas and are unaffected.
 * The global RateLimitError is now only thrown when ALL providers are exhausted.
 */
class ProviderRateLimiter {
  private cooldowns = new Map<string, number>(); // provider → cooldownUntil ms
  private consecutiveLimits = new Map<string, number>();

  public isProviderLimited(provider: string): boolean {
    const until = this.cooldowns.get(provider) ?? 0;
    if (until > Date.now()) return true;
    // Auto-clear if expired
    if (until > 0) {
      this.cooldowns.delete(provider);
      this.consecutiveLimits.delete(provider);
    }
    return false;
  }

  public limitProvider(provider: string, customSeconds?: number): number {
    const count = (this.consecutiveLimits.get(provider) ?? 0) + 1;
    this.consecutiveLimits.set(provider, count);
    const backoffSeconds = customSeconds ?? Math.min(count * 60, 15 * 60);
    this.cooldowns.set(provider, Date.now() + backoffSeconds * 1000);
    console.warn(`[RateLimiter] ${provider} limited for ${backoffSeconds}s`);
    return backoffSeconds;
  }

  public resetProvider(provider: string) {
    this.cooldowns.delete(provider);
    this.consecutiveLimits.delete(provider);
  }

  /** True only when every important provider is simultaneously rate-limited */
  public areAllProvidersBusy(): boolean {
    return this.isProviderLimited('google_books') && this.isProviderLimited('open_library');
  }
}

const providerLimiter = new ProviderRateLimiter();

/**
 * Legacy global rate-limiter shim — delegates to providerLimiter so existing
 * callers (getDetailedScanStats) still work without changes.
 */
class RateLimiter {
  public async init() {
    // Clear any stale DB record on startup (old schema) — best-effort
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'rate_limit_cooldown_until' },
      });
      if (setting) {
        const storedTime = parseInt(setting.value, 10);
        // Only delete; providerLimiter manages its own in-memory state
        if (storedTime <= Date.now()) {
          await prisma.setting.delete({ where: { key: 'rate_limit_cooldown_until' } }).catch(() => {});
        }
      }
    } catch {
      // Best-effort
    }
  }

  public getStatus(): { isRateLimited: boolean; remainingSeconds: number; reason?: string } {
    const googleLimited = providerLimiter.isProviderLimited('google_books');
    const openLibLimited = providerLimiter.isProviderLimited('open_library');
    // Only report globally rate-limited when ALL providers are blocked
    if (googleLimited && openLibLimited) {
      return { isRateLimited: true, remainingSeconds: 60, reason: 'All metadata providers temporarily limited' };
    }
    if (googleLimited) {
      return { isRateLimited: false, remainingSeconds: 0, reason: 'Google Books limited (using Open Library)' };
    }
    return { isRateLimited: false, remainingSeconds: 0 };
  }

  public resetCooldown() {
    providerLimiter.resetProvider('google_books');
    providerLimiter.resetProvider('open_library');
    prisma.setting.deleteMany({ where: { key: 'rate_limit_cooldown_until' } }).catch(() => {});
  }
}

export const rateLimiter = new RateLimiter();
export { providerLimiter };
rateLimiter.init().catch(() => {});

/**
 * Clean audio filenames and extract likely title and author.
 */
export function cleanFileName(fileName: string): CleanedTitleResult {
  const ext = path.extname(fileName);
  let baseName = path.basename(fileName, ext).trim();

  // Remove bracketed quality or platform markers
  baseName = baseName.replace(/\[[^\]]*\]/g, ' ');
  baseName = baseName.replace(/\([^)]*(?:kbps|audiobook|summary|blinkist|complete|unabridged)[^)]*\)/gi, ' ');
  baseName = baseName.replace(/\b(?:128|192|256|320)kbps\b/gi, ' ');
  baseName = baseName.replace(/\b(?:mp3|m4a|aac|flac|ogg|mka|opus)\b/gi, ' ');

  // Remove prefixes
  baseName = baseName.replace(/^\s*(?:summary\s+of|book\s+summary(?:\s*[-:]|\s+of)?)\s+/i, '');
  baseName = baseName.replace(/[_\s]+/g, ' ').trim();

  // Pattern: "<Title> (<Author>)"
  const parenMatch = baseName.match(/^(.*?)\s*\(([^()]+)\)$/);
  if (parenMatch) {
    const candidateTitle = parenMatch[1].trim();
    const candidateAuthor = parenMatch[2].trim();

    if (candidateAuthor.toLowerCase() === 'unknown') {
      return { title: candidateTitle, author: undefined, rawFileName: fileName };
    }
    return { title: candidateTitle, author: candidateAuthor, rawFileName: fileName };
  }

  // Pattern: "<Title> by <Author>" or "<Author> - <Title>"
  const byMatch = baseName.match(/^(.*?)\s+(?:by|-)\s+(.*)$/i);
  if (byMatch) {
    return { title: byMatch[1].trim(), author: byMatch[2].trim(), rawFileName: fileName };
  }

  return { title: baseName, rawFileName: fileName };
}

/**
 * Provider 1: Google Books API
 * Returns null (instead of throwing) when rate limited, so the pipeline falls through
 * to Open Library and Wikipedia immediately.
 */
async function fetchGoogleBooks(query: string, authorHint?: string): Promise<Partial<BookMetadataResult> | null> {
  if (providerLimiter.isProviderLimited('google_books')) {
    return null; // silently skip — other providers will fill the gap
  }

  try {
    let q = `intitle:${encodeURIComponent(query)}`;
    if (authorHint) q += `+inauthor:${encodeURIComponent(authorHint)}`;

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3${keyParam}`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' },
    });

    if (res.status === 429 || res.status === 403) {
      providerLimiter.limitProvider('google_books', 120); // 2-min cooldown for this provider only
      return null; // fall through to Open Library
    }
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      // Relaxed query fallback
      let fallbackQ = encodeURIComponent(query);
      if (authorHint) fallbackQ += `+${encodeURIComponent(authorHint)}`;
      const fallbackRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${fallbackQ}&maxResults=3${keyParam}`);
      if (fallbackRes.status === 429 || fallbackRes.status === 403) {
        providerLimiter.limitProvider('google_books', 120);
        return null;
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

    if (coverUrl) coverUrl = coverUrl.replace(/^http:\/\//i, 'https://');

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
  } catch {
    return null;
  }
}

/**
 * Provider 2: Open Library API (with detailed work description fetch)
 */
async function fetchOpenLibrary(query: string, authorHint?: string): Promise<Partial<BookMetadataResult> | null> {
  if (providerLimiter.isProviderLimited('open_library')) {
    return null;
  }

  try {
    let q = `title=${encodeURIComponent(query)}`;
    if (authorHint) q += `&author=${encodeURIComponent(authorHint)}`;

    const res = await fetch(`https://openlibrary.org/search.json?${q}&limit=2`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' },
    });

    if (res.status === 429) {
      providerLimiter.limitProvider('open_library', 120);
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    const doc = data.docs[0];
    const coverId = doc.cover_i;
    const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;

    let synopsis = typeof doc.first_sentence === 'string' ? doc.first_sentence : undefined;

    // If synopsis missing, attempt to fetch the full Open Library Work summary
    if (!synopsis && doc.key) {
      try {
        const workRes = await fetch(`https://openlibrary.org${doc.key}.json`);
        if (workRes.ok) {
          const workData = await workRes.json();
          if (typeof workData.description === 'string') {
            synopsis = workData.description;
          } else if (workData.description && typeof workData.description.value === 'string') {
            synopsis = workData.description.value;
          }
        }
      } catch {
        // Best-effort work detail fetch
      }
    }

    return {
      title: doc.title || query,
      author: doc.author_name ? doc.author_name.join(', ') : authorHint,
      synopsis,
      category: doc.subject && doc.subject.length > 0 ? doc.subject[0] : undefined,
      coverUrl,
      publisher: doc.publisher && doc.publisher.length > 0 ? doc.publisher[0] : undefined,
      publishedYear: doc.first_publish_year,
      isbn: doc.isbn && doc.isbn.length > 0 ? doc.isbn[0] : undefined,
      source: 'open_library',
    };
  } catch {
    return null;
  }
}

/**
 * Provider 3: Open Wikipedia / Wikimedia Knowledge API (Outstanding for Book Synopses & Themes)
 */
async function fetchWikipediaBookSummary(query: string, authorHint?: string): Promise<{ synopsis?: string } | null> {
  try {
    const searchTerms = [
      `${query} (book)`,
      `${query} (novel)`,
      `${query} ${authorHint || ''}`.trim(),
      query,
    ];

    for (const term of searchTerms) {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/ /g, '_'))}`,
        { headers: { 'User-Agent': 'PerBlinkist/1.0 (audiobook summary scanner)' } }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.extract && typeof data.extract === 'string' && data.type !== 'disambiguation') {
          return { synopsis: data.extract };
        }
      }
    }
  } catch {
    // Best-effort wikipedia lookup
  }
  return null;
}

/**
 * Provider 4: CrossRef Open Scholarly & Literature API
 */
async function fetchCrossRefMetadata(query: string, authorHint?: string): Promise<Partial<BookMetadataResult> | null> {
  try {
    let q = encodeURIComponent(query);
    if (authorHint) q += `+${encodeURIComponent(authorHint)}`;

    const res = await fetch(`https://api.crossref.org/works?query.bibliographic=${q}&rows=1`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' },
    });

    if (res.ok) {
      const data = await res.json();
      const item = data.message?.items?.[0];
      if (item) {
        const title = item.title?.[0];
        const author = item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).join(', ');
        const publisher = item.publisher;
        const year = item.published?.['date-parts']?.[0]?.[0];
        const category = item.subject?.[0];

        if (title) {
          return {
            title,
            author,
            publisher,
            publishedYear: typeof year === 'number' ? year : undefined,
            category,
            source: 'crossref',
          };
        }
      }
    }
  } catch {
    // Best-effort CrossRef
  }
  return null;
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
 * Multi-API Aggregator & Completeness Pipeline:
 * Queries Google Books, Open Library, Wikipedia, and CrossRef.
 * Fills in missing synopses, categories, publishers, or covers across all providers.
 * Returns a unified metadata object to store in SQLite once and for all.
 *
 * A per-provider rate limit (e.g. Google Books 429) silently falls through to the
 * next provider. A global RateLimitError is only thrown when ALL providers are blocked.
 */
export async function resolveBookMetadata(
  fileName: string,
  embeddedHints?: { title?: string; author?: string; genre?: string }
): Promise<BookMetadataResult> {
  const cleaned = cleanFileName(fileName);
  const queryTitle = embeddedHints?.title || cleaned.title;
  const queryAuthor = embeddedHints?.author || cleaned.author;

  let title = queryTitle;
  let author = queryAuthor;
  let synopsis: string | undefined;
  let category: string | undefined = embeddedHints?.genre;
  let coverUrl: string | undefined;
  let publisher: string | undefined;
  let publishedYear: number | undefined;
  let isbn: string | undefined;
  let primarySource: BookMetadataResult['source'] = 'fallback';

  // 1. First attempt: Google Books (returns null on 429 — does NOT block other providers)
  const google = await fetchGoogleBooks(queryTitle, queryAuthor);
  if (google) {
    primarySource = 'google_books';
    if (google.title) title = google.title;
    if (google.author) author = google.author;
    if (google.synopsis) synopsis = google.synopsis;
    if (google.category) category = google.category;
    if (google.coverUrl) coverUrl = google.coverUrl;
    if (google.publisher) publisher = google.publisher;
    if (google.publishedYear) publishedYear = google.publishedYear;
    if (google.isbn) isbn = google.isbn;
  }

  // 2. Second attempt: Open Library (always runs if anything is missing)
  if (!synopsis || !coverUrl || !category) {
    const openLib = await fetchOpenLibrary(queryTitle, queryAuthor);
    if (openLib) {
      if (primarySource === 'fallback') primarySource = 'open_library';
      else primarySource = 'merged';

      if (!title && openLib.title) title = openLib.title;
      if (!author && openLib.author) author = openLib.author;
      if (!synopsis && openLib.synopsis) synopsis = openLib.synopsis;
      if (!category && openLib.category) category = openLib.category;
      if (!coverUrl && openLib.coverUrl) coverUrl = openLib.coverUrl;
      if (!publisher && openLib.publisher) publisher = openLib.publisher;
      if (!publishedYear && openLib.publishedYear) publishedYear = openLib.publishedYear;
      if (!isbn && openLib.isbn) isbn = openLib.isbn;
    }
  }

  // If both primary providers are simultaneously blocked, signal the scanner to pause
  if (providerLimiter.areAllProvidersBusy()) {
    throw new RateLimitError('All metadata providers are temporarily rate-limited.', 120);
  }

  // 3. Third attempt: Wikipedia Knowledge Summary (specifically if synopsis is still missing)
  if (!synopsis) {
    const wiki = await fetchWikipediaBookSummary(queryTitle, queryAuthor);
    if (wiki?.synopsis) {
      synopsis = wiki.synopsis;
      primarySource = primarySource === 'fallback' ? 'wikipedia' : 'merged';
    }
  }

  // 4. Fourth attempt: CrossRef (if publisher, category, or year still missing)
  if (!publisher || !category || !publishedYear) {
    const crossref = await fetchCrossRefMetadata(queryTitle, queryAuthor);
    if (crossref) {
      if (!category && crossref.category) category = crossref.category;
      if (!publisher && crossref.publisher) publisher = crossref.publisher;
      if (!publishedYear && crossref.publishedYear) publishedYear = crossref.publishedYear;
      if (primarySource === 'fallback') primarySource = 'crossref';
      else primarySource = 'merged';
    }
  }

  return {
    title: title || queryTitle,
    author: author || queryAuthor,
    synopsis,
    category: category || 'General',
    coverUrl,
    publisher,
    publishedYear,
    isbn,
    source: primarySource,
  };
}
