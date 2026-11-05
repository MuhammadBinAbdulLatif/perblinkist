import { prisma } from './prisma';

let cachedTrendingIds: string[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hour cache for trending cross-reference

/**
 * Searches Google Books for trending / bestselling non-fiction titles,
 * then cross-references candidates against our local SQLite database.
 * Returns up to 10 matching audiobooks present in the user's library.
 */
export async function getTrendingLocalBooks(limit: number = 10) {
  const now = Date.now();

  // Return cached matches if fresh
  if (cachedTrendingIds.length >= limit && now - cacheTimestamp < CACHE_TTL_MS) {
    const cachedBooks = await prisma.bookSummary.findMany({
      where: { id: { in: cachedTrendingIds }, isMissing: false },
    });
    if (cachedBooks.length >= limit) {
      return cachedBooks.slice(0, limit);
    }
  }

  const trendingQueries = [
    'bestseller non-fiction',
    'new york times bestseller',
    'popular psychology personal growth',
    'trending business leadership',
    'most read self-improvement',
  ];

  const candidateExternalTitles: string[] = [];

  for (const q of trendingQueries) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&orderBy=relevance&maxResults=20`,
        { headers: { 'User-Agent': 'PerBlinkist/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            const title = item.volumeInfo?.title;
            if (title && typeof title === 'string') {
              candidateExternalTitles.push(title);
            }
          }
        }
      }
    } catch {
      // Best-effort external trending fetch
    }
  }

  const matchedIds = new Set<string>();
  const matchedBooks: any[] = [];

  // Cross-reference candidate titles against local SQLite database
  for (const extTitle of candidateExternalTitles) {
    const cleanCandidate = extTitle.replace(/[^\w\s]/g, '').trim().slice(0, 25);
    if (cleanCandidate.length < 3) continue;

    const localMatch = await prisma.bookSummary.findFirst({
      where: {
        isMissing: false,
        id: { notIn: Array.from(matchedIds) },
        title: { contains: cleanCandidate },
      },
    });

    if (localMatch && !matchedIds.has(localMatch.id)) {
      matchedIds.add(localMatch.id);
      matchedBooks.push(localMatch);
      if (matchedBooks.length >= limit) break;
    }
  }

  // Fallback: If external trending found fewer than requested,
  // complement with top enriched or most recently played local summaries
  if (matchedBooks.length < limit) {
    const fallbackBooks = await prisma.bookSummary.findMany({
      where: {
        isMissing: false,
        id: { notIn: Array.from(matchedIds) },
        isEnriched: true,
      },
      take: limit - matchedBooks.length,
      orderBy: [{ lastPlayedAt: 'desc' }, { createdAt: 'desc' }],
    });

    for (const b of fallbackBooks) {
      matchedIds.add(b.id);
      matchedBooks.push(b);
      if (matchedBooks.length >= limit) break;
    }
  }

  // Update cache
  cachedTrendingIds = matchedBooks.map((b) => b.id);
  cacheTimestamp = now;

  return matchedBooks;
}
