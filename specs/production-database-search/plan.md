# Plan: Production-Ready Global Full-Text Search Across Library

## 1. Database Indexing & Search Engine Optimization
In SQLite / Prisma:
Ensure compound index or multi-field query optimization for:
- `title`
- `author`
- `category`
- `isMissing`

## 2. Server-side Search Procedure (`server/routers/app.ts`)
Implement `searchGlobal`:
```typescript
searchGlobal: publicProcedure
  .input(z.object({
    query: z.string().min(1),
    limit: z.number().min(1).max(50).default(8)
  }))
  .query(async ({ input }) => {
    // Multi-term tokenized database query
    // Queries title, author, category, synopsis, fileName
    // Returns results + totalMatchCount
  })
```

## 3. Reusable Global Search Component (`components/GlobalSearchBar.tsx`)
A production-grade search input component with:
- Keyboard shortcuts (`Ctrl+K` or `/` to focus).
- Debounced query execution (250ms).
- Live dropdown overlay showing direct database query results:
  - Book cover thumbnail
  - Book title (with highlighted term)
  - Author and category
  - Duration pill
  - Instant play button
- Direct navigation: Clicking a result takes the user to `/book/[id]`.
- Pressing `Enter` navigates to `/books?search=${encodeURIComponent(query)}` to paginate through all database matches.

## 4. Integration Across Routes
- Mount `GlobalSearchBar` in navigation bar on:
  - `app/page.tsx`
  - `app/books/page.tsx`
  - `app/book/[id]/page.tsx`
  - `app/listen-later/page.tsx`

## 5. Verification
- Test build with `pnpm run build`.
- Verify database queries for partial titles, authors, and synopsis keywords.
