# Requirements: Authors Browsing & Listening History

## 1. Problem Statement & Scope
Users need a way to:
1. Discover and browse authors who have audiobook summaries in their personal collection (`/authors`), view author counts (how many summaries each author has), search/filter authors, and inspect all summaries by a specific author on a dedicated author detail page (`/author/[name]` or `/authors/[name]`).
2. View their complete listening history (`/history`), tracking summaries that are in progress (with progress %, remaining time) and completed, with ability to jump straight into playback or clear history records.

## 2. User Stories
- As a user, I can click "Authors" in the navigation to see a catalog of all unique authors represented in my audio summaries library, along with their book count.
- As a user, I can search authors in real-time or sort them (by number of books, or alphabetical A-Z).
- As a user, I can click an author to visit their dedicated page (`/authors/[name]`), seeing their biographical overview/stats and all book summaries written by them in our collection.
- As a user, I can navigate to "History" from the menu or header to see everything I have listened to or completed, filter between "All", "In Progress", and "Completed", and resume listening with 1 click.
- As a user, loading states and skeletons are shown gracefully while queries resolve without flashes or layout shifts.

## 3. Data & API Requirements
- `getAuthorsWithCounts`: tRPC query returning authors list with book counts and optional sample book covers, sorted by count desc or alphabetical.
- `getBooksByAuthor`: tRPC query returning all books where `author` matches (case-insensitive exact or normalized match).
- `getListeningHistory`: tRPC query returning books where `playbackPosition > 0` or `isCompleted = true` or `lastPlayedAt is not null`, ordered by `lastPlayedAt desc`.
- `clearBookHistory`: tRPC mutation allowing user to reset playback position / mark uncompleted for a specific book or clear all history.
