# Requirements: Global Persistent Audio Player Across Routes

## 1. Problem Statement
When a user begins playback of an audiobook summary on the home dashboard, navigating to the dedicated summary page (`/book/[id]`) or the saved summaries page (`/listen-later`) causes the bottom audio player bar to disappear or interrupts playback state, because the player was tied locally to `app/page.tsx` rather than mounted in the global root shell.
Users need uninterrupted, persistent playback that stays visible and controllable across all route transitions.

## 2. User Stories & Acceptance Criteria
- **US 1 (Global Player Shell)**:
  - When playback starts on any page, navigating between `/`, `/book/[id]`, `/listen-later`, or any other route must keep the audio playing seamlessly with zero interruption.
  - The bottom player bar must remain docked and visible across all routes while an audio track is active.
- **US 2 (Universal Controls)**:
  - Play/pause, 10s/15s back, 30s forward, scrub bar, and variable playback speed controls in the bottom player bar function from any route.
  - Clicking the book title/cover in the bottom dock navigates directly to that summary's details page (`/book/[id]`).
- **US 3 (Coordination with Book Detail Page)**:
  - If a user is on `/book/[id]` for the actively playing book, the page's centered controls and the global player stay in sync.
  - If the user clicks "Listen Now" on `/book/[id]` for a different book, the global player switches to that book.
- **US 4 (Playback Persistence)**:
  - Regular auto-sync to SQLite (`updateProgress`) continues regardless of what page the user is currently viewing.
