# Plan: Authors Browsing & Listening History

## 1. Backend Procedures (`server/routers/app.ts`)
1. **`getAuthorsWithCounts`**:
   - Query all distinct non-null authors in `BookSummary` where `isMissing: false`.
   - Aggregate count of summaries per author.
   - For top authors or on author card, return up to 3 sample book summaries/covers so cards look visually rich.
   - Support `search` filter and `sortBy: 'count' | 'name'`.

2. **`getAuthorDetails`**:
   - Input: `{ authorName: string }`.
   - Query all books by this author (`{ author: { equals: authorName } }`), sorted by title or publishedYear.
   - Compute total listen duration for this author's collection.

3. **`getListeningHistory`**:
   - Query `BookSummary` where `(playbackPosition > 0 or isCompleted = true or lastPlayedAt is not null) and isMissing = false`.
   - Sort by `lastPlayedAt desc` (fallback `updatedAt desc`).
   - Support optional `filter: 'all' | 'in_progress' | 'completed'`.

4. **`clearListeningHistory`**:
   - Mutation to clear single book history (`{ bookId?: string, all?: boolean }`).

## 2. Frontend Pages & Components
1. **Header Navigation Updates (`components/AppHeader.tsx`)**:
   - Add links to `Authors` (`/authors`) and `History` (`/history`) in both desktop navigation and mobile dropdown menu.

2. **Authors Directory Page (`app/authors/page.tsx`)**:
   - Responsive grid of author cards showing author name, count of book summaries, sample cover thumbnails, total audio duration.
   - Search input for authors and sorting options.
   - Skeleton loading states.

3. **Author Detail Page (`app/authors/[name]/page.tsx`)**:
   - Clean profile header with Author initial/avatar, summary counts, total listen time.
   - Grid of all audiobooks written by that author in our library with instant play and details links.
   - Skeleton loading states.

4. **Listening History Page (`app/history/page.tsx`)**:
   - Filter tabs: All, In Progress, Completed.
   - Stats summary: Total listened summaries, completed count, total in-progress time.
   - List/Grid with progress bars, last played date timestamps, play button, and clear action.
   - Skeleton loading states.

## 3. Validation
- Run TypeScript checks and Turbopack production build (`pnpm run build`).
- Verify links from AppHeader to `/authors` and `/history`.
