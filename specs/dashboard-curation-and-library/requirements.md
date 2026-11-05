# Requirements: Blinkist-Grade Dashboard & All Books Library Catalog

## 1. Problem Statement & Overview
When a user opens PerBlinkist with thousands of audiobooks in their mounted collection, a simple flat list or small random sample causes decision paralysis. The home dashboard needs an intentional curation system inspired by Blinkist / Audible / Spotify, with clear discovery shelves, categorized navigation, and a separate, dedicated paginated catalog view for the entire library.

## 2. User Stories & Acceptance Criteria

### A. Dedicated All Books Catalog (`/books` or `/library`)
- **US 1 (Browse Entire Library)**:
  - Accessible via a prominent "Browse All Books" / "View All" button on the dashboard header and shelves.
  - Route: `/books` (with category filter and search parameters).
  - Paginated at **30 books per page** using numeric or previous/next cursor controls to effortlessly handle thousands of audiobooks without overwhelming the browser or database.
  - Sorting options (Title A-Z, Recently Added, Shortest/Longest duration).

### B. Curated Dashboard Shelves (`/`)
- **US 2 (Continue Listening)**:
  - Shelf displaying up to 10 books where `playbackPosition > 0` and `isCompleted = false`, sorted by `lastPlayedAt desc`.
  - Shows an inline progress bar and exact minutes remaining so the user can immediately resume.
- **US 3 (Trending / Buzzing in the World)**:
  - Finds what is trending or bestselling in the book world (via Google Books bestseller/trending query or popular queries like "bestseller", "trending non-fiction", "personal growth") and cross-references against our local SQLite database.
  - Matches up to 10 audiobooks that exist in our actual local library with a "🔥 Trending" badge.
  - Falls back smoothly to highly rated or most-accessed local titles if external query finds fewer than 10.
- **US 4 (Discover Something New / Random Picks)**:
  - 10 randomly selected audiobooks from SQLite with a refresh / reshuffle option so users can serendipitously discover hidden gems in their thousands of audiobooks.
- **US 5 (Quick Daily Read / Short Summaries)**:
  - 10 shortest summaries (< 15 mins) for users who only have a few minutes today.

### C. Category & Genre Navigation Sidebar / Section
- **US 6 (Genre Taxonomy & Book Counts)**:
  - A clean vertical or dedicated right-hand column (audiobook-bay / Blinkist inspired).
  - Displays all detected categories (e.g. Psychology, Productivity, History, Business, Self-Help, Science, Philosophy) with the exact count of books in each category (`Psychology (142)`, `History (89)`, etc.).
  - Clicking any category filters or navigates to `/books?category=...`.

### D. Consistency & Polish
- Centered audio player context remains persistent.
- Adheres to the established shadcn Zinc/dark theme aesthetic.
- **No Git commits or pushes** unless explicitly commanded by user.
