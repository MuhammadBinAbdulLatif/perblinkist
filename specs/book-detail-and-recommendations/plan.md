# Plan: Dedicated Audiobook Detail Page, Recommendations, Download & Listen Later

## 1. Database Schema Additions (`prisma/schema.prisma`)
Add a `ListenLater` model linked to `User` and `BookSummary`:
```prisma
model ListenLater {
  id        String   @id @default(cuid())
  userId    String
  bookId    String
  createdAt DateTime @default(now())

  user User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  book BookSummary @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
  @@index([userId])
  @@index([bookId])
}
```

## 2. Recommendation Engine (`lib/recommendations.ts`)
1. Accepts `bookId` and current book details.
2. Queries Google Books API for similar volumes:
   - Query: `subject:"${category}"` or related books by the same author.
   - Extracts related titles, authors, and keywords.
3. Cross-references against local SQLite database:
   - Finds local `BookSummary` records matching those titles or authors (`isMissing: false`, excluding current `bookId`).
   - If fewer than 4 matches, complements with books sharing the same category or author in local database.
4. Returns matching available local books.

## 3. Dedicated Download Route (`app/api/download/[id]/route.ts`)
- Resolves file using `resolveAudioPath`.
- Sets headers:
  - `Content-Disposition: attachment; filename="${fileName}"`
  - `Content-Type: application/octet-stream` or MIME type.
  - Streams file to client.

## 4. tRPC Router Extensions (`server/routers/app.ts`)
- `getBookDetails`: Fetches book, listen later status for current user, and recommendations.
- `getRecommendations`: Returns locally matched recommendations based on API results.
- `toggleListenLater`: Mutation to add/remove a book from current user's list.
- `getListenLaterBooks`: Query returning the list of queued summaries for current user.

## 5. UI Views & Pages
1. `/book/[id]/page.tsx`:
   - Hero header with back button and breadcrumb.
   - Centered audio player dock/card with prominent controls, time scrubbing, speed selector, and volume.
   - Metadata grid: Category, Duration, Author, Year, Publisher, Codec, Bitrate.
   - Action buttons: "Play / Pause", "Listen Later (Bookmark)", "Download Audio File", "Mark Completed".
   - Full expandable/readable Synopsis section.
   - "Related in Your Library" shelf with click-to-navigate cards.
2. `/listen-later/page.tsx`:
   - Dedicated view showcasing saved summaries with progress indicators and remove actions.
3. Global Header update (`app/page.tsx`, etc.):
   - Add navigation links to "Home" and "Listen Later" with badge count.

## 6. Implementation Order
1. Update `prisma/schema.prisma` and push to SQLite.
2. Implement `lib/recommendations.ts`.
3. Create `app/api/download/[id]/route.ts`.
4. Update `server/routers/app.ts` with listen-later and recommendation procedures.
5. Create `/book/[id]/page.tsx` and `/listen-later/page.tsx`.
6. Verify with automated script and Next.js Turbopack build.
