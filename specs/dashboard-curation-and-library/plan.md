# Plan: Blinkist-Grade Dashboard & All Books Library Catalog

## 1. Backend Procedures (`server/routers/app.ts`)
1. **`getPaginatedBooks`**:
   - Inputs: `page: number (default 1)`, `pageSize: number (default 30)`, `category: string (optional)`, `search: string (optional)`, `sortBy: 'recent' | 'title' | 'duration_asc' | 'duration_desc'`.
   - Output: `{ books, totalCount, totalPages, currentPage }`.
2. **`getCategoriesWithCounts`**:
   - Groups local `BookSummary` records by `category` (excluding missing files) and returns a sorted list of `{ category, count }`.
3. **`getContinueListening`**:
   - Queries `playbackPosition > 0`, `isCompleted: false`, `isMissing: false`, order by `lastPlayedAt desc`, limit 10.
4. **`getTrendingBooks`** (`lib/trending.ts`):
   - Queries Google Books API for trending / popular volume subjects ("bestseller", "most popular non-fiction", "personal growth", "new york times bestseller").
   - Cross-references titles and authors against SQLite `BookSummary` where `isMissing: false`.
   - Collects up to 10 matching local books.
   - Fallback: top recent or enriched local books if Google Books matches are fewer than 10.
5. **`getRandomPicks`**:
   - Selects 10 random books from SQLite (`isMissing: false`).
6. **`getQuickReads`**:
   - Selects up to 10 books with shortest duration (`durationSeconds > 0`, order by `durationSeconds asc`).

## 2. Trending Service (`lib/trending.ts`)
- Implements cached query to Google Books API for top popular non-fiction books.
- Extracts titles and checks local SQLite database for matches.
- Returns list of up to 10 matched local audiobooks.

## 3. Dedicated Library View (`app/books/page.tsx`)
- Paginated catalog displaying 30 books per page.
- Category dropdown / filter pills.
- Sort selector: Newest, Title A-Z, Shortest, Longest.
- Numbered pagination controls: `Prev`, `1, 2, 3 ... N`, `Next`.
- Direct play and detail view links.

## 4. Redesigned Dashboard (`app/page.tsx`)
- 2-Column layout on desktop:
  - **Left / Main Column (3/4 width)**:
    - **Hero Spotlight** ("Pick of the Day")
    - **"Continue Listening" Shelf (10 books)** with progress bar and resume button.
    - **"Trending Worldwide in Your Collection" Shelf (10 books)** powered by the Google Books cross-referenced trending engine.
    - **"Discover Something New" Shelf (10 random books)** with a "Shuffle" button.
    - **"Quick 15-Minute Listens" Shelf (10 shortest summaries)**.
  - **Right Column (1/4 width)**:
    - Dedicated Genre & Category list (Audiobook Bay inspired) with book counts (`Productivity (24)`, `Psychology (18)`, etc.).
    - Quick filter links navigating to `/books?category=...`.
    - Library Stats counter (Total summaries, total hours of audio).

## 5. Verification
- Test build with Turbopack (`pnpm run build`).
- Verify pagination at 30 items.
- Ensure persistent audio player bar continues uninterrupted across navigation.
