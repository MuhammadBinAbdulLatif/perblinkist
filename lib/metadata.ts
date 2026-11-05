import fs from 'fs';
import path from 'path';

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

/**
 * Clean audio filenames and extract likely title and author.
 * Examples:
 * - "[Blinkist] Atomic Habits by James Clear (128kbps).mp3" -> Title: "Atomic Habits", Author: "James Clear"
 * - "James Clear - Atomic Habits.m4a" -> Title: "Atomic Habits", Author: "James Clear"
 * - "Summary of Thinking, Fast and Slow.mp3" -> Title: "Thinking, Fast and Slow"
 */
export function cleanFileName(fileName: string): CleanedTitleResult {
  const ext = path.extname(fileName);
  let baseName = path.basename(fileName, ext);

  // 1. Remove bracketed quality, platform markers, or tags: [Blinkist], (128kbps), [Audiobook], etc.
  baseName = baseName.replace(/\[[^\]]*\]/g, ' ');
  baseName = baseName.replace(/\([^)]*(?:kbps|audiobook|summary|blinkist|complete|unabridged)[^)]*\)/gi, ' ');
  baseName = baseName.replace(/\b(?:128|192|256|320)kbps\b/gi, ' ');
  baseName = baseName.replace(/\b(?:mp3|m4a|aac|flac|ogg)\b/gi, ' ');

  // 2. Remove common prefixes like "Summary of", "Book Summary -", etc.
  baseName = baseName.replace(/^\s*(?:summary\s+of|book\s+summary(?:\s*[-:]|\s+of)?)\s+/i, '');

  // 3. Clean multiple spaces, underscores, dashes
  baseName = baseName.replace(/[_\s]+/g, ' ').trim();

  // 4. Try parsing "Title by Author"
  const byMatch = baseName.match(/^(.*?)\s+(?:by|-)\s+(.*)$/i);
  if (byMatch) {
    const part1 = byMatch[1].trim();
    const part2 = byMatch[2].trim();

    // If part1 looks like a well-known author format or vice versa:
    // Usually "Atomic Habits by James Clear" -> part1 = title, part2 = author
    return {
      title: part1,
      author: part2,
      rawFileName: fileName
    };
  }

  // 5. Try parsing "Author - Title"
  if (baseName.includes(' - ')) {
    const parts = baseName.split(' - ');
    if (parts.length >= 2) {
      // Heuristic: If part 1 has <= 3 words, it's often the author, part 2 is title
      const p1 = parts[0].trim();
      const p2 = parts.slice(1).join(' - ').trim();
      return {
        title: p2,
        author: p1,
        rawFileName: fileName
      };
    }
  }

  return {
    title: baseName,
    rawFileName: fileName
  };
}

/**
 * Fetch book metadata from Google Books API
 */
async function fetchGoogleBooks(query: string, authorHint?: string): Promise<BookMetadataResult | null> {
  try {
    let q = encodeURIComponent(query);
    if (authorHint) {
      q += `+inauthor:${encodeURIComponent(authorHint)}`;
    }

    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' },
      next: { revalidate: 86400 } // cache 24h
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const info = item.volumeInfo || {};

    let coverUrl = info.imageLinks?.extraLarge ||
      info.imageLinks?.large ||
      info.imageLinks?.medium ||
      info.imageLinks?.thumbnail ||
      info.imageLinks?.smallThumbnail;

    if (coverUrl) {
      // Prefer HTTPS
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
      source: 'google_books'
    };
  } catch (err) {
    console.error('Google Books API fetch failed:', err);
    return null;
  }
}

/**
 * Fetch fallback metadata from Open Library API
 */
async function fetchOpenLibrary(query: string, authorHint?: string): Promise<BookMetadataResult | null> {
  try {
    let q = `title=${encodeURIComponent(query)}`;
    if (authorHint) {
      q += `&author=${encodeURIComponent(authorHint)}`;
    }

    const res = await fetch(`https://openlibrary.org/search.json?${q}&limit=2`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' }
    });

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
      source: 'open_library'
    };
  } catch (err) {
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
 * Orchestrator: Try Google Books first, then Open Library, then fall back to cleaned filename.
 */
export async function resolveBookMetadata(fileName: string): Promise<BookMetadataResult> {
  const cleaned = cleanFileName(fileName);

  // 1. Primary: Google Books
  const googleResult = await fetchGoogleBooks(cleaned.title, cleaned.author);
  if (googleResult) {
    return googleResult;
  }

  // 2. Secondary: Open Library
  const openLibraryResult = await fetchOpenLibrary(cleaned.title, cleaned.author);
  if (openLibraryResult) {
    return openLibraryResult;
  }

  // 3. Fallback: Cleaned Title & Author
  return {
    title: cleaned.title,
    author: cleaned.author,
    source: 'fallback'
  };
}
