import { prisma } from './prisma';

export interface RecommendationResult {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  localCoverPath: string | null;
  durationSeconds: number | null;
  category: string | null;
  synopsis: string | null;
  matchReason: string;
}

/**
 * Tokenize string into significant keywords (length >= 4, ignoring common stop words)
 */
function extractSignificantKeywords(text: string): string[] {
  const stopWords = new Set([
    'with', 'about', 'from', 'this', 'that', 'your', 'their', 'what', 'which',
    'have', 'more', 'when', 'some', 'book', 'audiobook', 'summary', 'edition',
    'guide', 'part', 'life', 'read', 'time', 'into', 'just', 'over'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));
}

/**
 * Fetch recommendation suggestions from Google Books API
 */
async function fetchGoogleBooksRecommendations(title: string, author?: string, category?: string): Promise<string[]> {
  const suggestedTitles: string[] = [];

  try {
    let query = '';
    if (category && category !== 'General') {
      query = `subject:${encodeURIComponent(category)}`;
    } else if (author) {
      query = `inauthor:${encodeURIComponent(author)}`;
    } else {
      query = encodeURIComponent(title);
    }

    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10`, {
      headers: { 'User-Agent': 'PerBlinkist/1.0' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const itemTitle = item.volumeInfo?.title;
          if (itemTitle && typeof itemTitle === 'string') {
            suggestedTitles.push(itemTitle);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Recommendations] Error fetching external suggestions:', err);
  }

  return suggestedTitles;
}

/**
 * Robust, Shared-Attribute Recommendation Engine:
 * ONLY recommends books that have actual proven attributes in common:
 * 1. Cross-referenced external bestseller recommendations matching our library.
 * 2. Shared author (same author, other titles in our collection).
 * 3. Shared category/genre (e.g. Psychology, Productivity, Science).
 * 4. Semantic title/subject overlap (meaningful thematic keywords).
 * NO random unrelated fallbacks.
 */
export async function getBookRecommendations(
  currentBookId: string,
  limit: number = 6
): Promise<RecommendationResult[]> {
  const currentBook = await prisma.bookSummary.findUnique({
    where: { id: currentBookId },
  });

  if (!currentBook) return [];

  const results: RecommendationResult[] = [];
  const addedIds = new Set<string>([currentBookId]);

  // Strategy 1: External API recommendations cross-referenced with local SQLite
  const externalTitles = await fetchGoogleBooksRecommendations(
    currentBook.title,
    currentBook.author || undefined,
    currentBook.category || undefined
  );

  if (externalTitles.length > 0) {
    for (const extTitle of externalTitles) {
      const cleanCandidate = extTitle.replace(/[^\w\s]/g, '').trim().slice(0, 22);
      if (cleanCandidate.length < 3) continue;

      const localMatches = await prisma.bookSummary.findMany({
        where: {
          id: { notIn: Array.from(addedIds) },
          isMissing: false,
          OR: [
            { title: { contains: cleanCandidate } },
            { title: { equals: extTitle } },
          ],
        },
        take: 2,
      });

      for (const match of localMatches) {
        if (!addedIds.has(match.id)) {
          addedIds.add(match.id);
          results.push({
            id: match.id,
            title: match.title,
            author: match.author,
            coverUrl: match.coverUrl,
            localCoverPath: match.localCoverPath,
            durationSeconds: match.durationSeconds,
            category: match.category,
            synopsis: match.synopsis,
            matchReason: 'Top reading recommendation',
          });
          if (results.length >= limit) return results;
        }
      }
    }
  }

  // Strategy 2: Shared Author (Must have author in common)
  if (results.length < limit && currentBook.author && currentBook.author !== 'Unknown') {
    const authorMatches = await prisma.bookSummary.findMany({
      where: {
        id: { notIn: Array.from(addedIds) },
        isMissing: false,
        author: { contains: currentBook.author },
      },
      take: limit - results.length,
    });

    for (const match of authorMatches) {
      if (!addedIds.has(match.id)) {
        addedIds.add(match.id);
        results.push({
          id: match.id,
          title: match.title,
          author: match.author,
          coverUrl: match.coverUrl,
          localCoverPath: match.localCoverPath,
          durationSeconds: match.durationSeconds,
          category: match.category,
          synopsis: match.synopsis,
          matchReason: `Also written by ${currentBook.author}`,
        });
        if (results.length >= limit) return results;
      }
    }
  }

  // Strategy 3: Shared Category / Subject (Must share exact or primary category)
  if (results.length < limit && currentBook.category && currentBook.category !== 'General') {
    const primaryCat = currentBook.category.split(/[,/]/)[0].trim();
    const categoryMatches = await prisma.bookSummary.findMany({
      where: {
        id: { notIn: Array.from(addedIds) },
        isMissing: false,
        category: { contains: primaryCat },
      },
      take: limit - results.length,
      orderBy: { lastPlayedAt: 'desc' },
    });

    for (const match of categoryMatches) {
      if (!addedIds.has(match.id)) {
        addedIds.add(match.id);
        results.push({
          id: match.id,
          title: match.title,
          author: match.author,
          coverUrl: match.coverUrl,
          localCoverPath: match.localCoverPath,
          durationSeconds: match.durationSeconds,
          category: match.category,
          synopsis: match.synopsis,
          matchReason: `More in ${primaryCat}`,
        });
        if (results.length >= limit) return results;
      }
    }
  }

  // Strategy 4: Thematic Keyword Overlap in Title/Synopsis
  if (results.length < limit) {
    const keywords = extractSignificantKeywords(currentBook.title);
    if (keywords.length > 0) {
      const keywordConditions = keywords.slice(0, 3).map((kw) => ({ title: { contains: kw } }));
      const keywordMatches = await prisma.bookSummary.findMany({
        where: {
          id: { notIn: Array.from(addedIds) },
          isMissing: false,
          OR: keywordConditions,
        },
        take: limit - results.length,
      });

      for (const match of keywordMatches) {
        if (!addedIds.has(match.id)) {
          addedIds.add(match.id);
          results.push({
            id: match.id,
            title: match.title,
            author: match.author,
            coverUrl: match.coverUrl,
            localCoverPath: match.localCoverPath,
            durationSeconds: match.durationSeconds,
            category: match.category,
            synopsis: match.synopsis,
            matchReason: 'Similar theme or subject',
          });
          if (results.length >= limit) return results;
        }
      }
    }
  }

  return results;
}
