# Requirements: Dedicated Audiobook Detail Page, Recommendations, Download & Listen Later

## 1. Problem Statement & Motivation
Users need a focused, immersive view for individual audiobooks / summaries where they can:
1. Examine detailed metadata: Synopsis, author, categories, publisher, release year, duration, file format, audio quality, and cover artwork.
2. Experience a centered, prominent, high-fidelity audio player with interactive progress scrub bar, play/pause, 10s back / 30s forward, playback speeds (0.75x to 2x), and persistent playback synchronization.
3. Download the audio file directly with appropriate headers (`Content-Disposition: attachment; filename="..."`).
4. Manage personal saving workflows like **"Listen Later"** (bookmarking) and Mark as Completed.
5. Discover **contextual recommendations**: First query external API (Google Books) for related titles based on author, category, or title; cross-reference these recommendations against the user's local SQLite library to show matching summaries currently available in the collection.

## 2. User Stories & Acceptance Criteria
- **US 1 (Audiobook Page Route)**:
  - Accessible at `/book/[id]`.
  - Responsive, dark-themed UI adhering to Shadcn/Zinc design standards.
  - Displays cover art, author, title, publication metadata, badges (format, duration, category), and full synopsis.
- **US 2 (Centered Focused Audio Player)**:
  - Centered player controls with clean time indicator (`mm:ss / mm:ss`), scrubbable slider, playback rate switcher, and keyboard/play controls.
  - Updates database playback position and completion status automatically.
- **US 3 (API-Driven Local Library Recommendations)**:
  - Fetches related books from Google Books / Open Library using title, author, or category.
  - Searches the local SQLite database for books matching those titles/authors.
  - Displays matching available audiobooks as a "Recommended from your Library" carousel/shelf.
  - If no direct external matches exist locally, gracefully falls back to genre/author matches from the local database.
- **US 4 (Audio Download)**:
  - Dedicated download route `/api/download/[id]` or action triggering genuine file download with clean original filename.
- **US 5 (Listen Later & Library Saved Management)**:
  - Add/remove books to a personal "Listen Later" queue.
  - Dedicated `/listen-later` view showcasing queued audiobooks with quick play and remove options.
  - Navigation header links across Home, Listen Later, and book views.
