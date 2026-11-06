# Requirements: Native App Experience (PWA) & Offline Listening

## 1. Problem Statement
PerBlinkist is a web-based audiobook summary platform, but users often listen on mobile devices (smartphones, tablets) during commutes, walks, flights, or in areas with poor or absent network connectivity (gyms, airplanes, subway trains).
Users need:
1. An **installable Progressive Web App (PWA)** that launches like a native app (standalone full screen, no browser URL bar, custom app icons, splash theme colors).
2. An **Offline Listening / Caching** capability so users can download specific audiobook summaries and their covers directly to local browser storage (CacheStorage / IndexedDB Blob store).
3. The ability to access their downloaded summaries in an "Offline Downloads" shelf or page and play them back seamlessly with zero network access.

## 2. User Stories
- **PWA Installation**:
  - As a user on Android Chrome or iOS Safari, I can tap "Add to Home Screen" or click an install prompt button.
  - The app launches with a standalone window frame, emerald/zinc theme styling, and official PerBlinkist app icons.
- **Offline Download**:
  - On any book summary card or book detail page, I can click "Download for Offline".
  - The browser downloads the audio binary (`/api/download/[id]` or `/api/stream/[id]`) and cached cover into browser storage (IndexedDB / CacheStorage).
  - The download button shows real-time progress / download state (`downloading`, `downloaded`, `remove`).
- **Offline Playback**:
  - When the user loses internet or toggles airplane mode, previously downloaded audiobooks remain 100% playable in the Global Audio Player without fetching from `/api/stream/[id]`.
  - The player transparently serves the local Blob / cached response.
- **Manage Downloads**:
  - A dedicated "Downloads" tab or page (`/downloads`) showing all saved offline audiobooks, total disk space used, and one-click removal to free up space.

## 3. Technical Constraints & Architecture
- Web App Manifest (`manifest.webmanifest` / `manifest.json`) complying with W3C PWA standards.
- Custom service worker (`public/sw.js`) handling cache lifecycle, offline shell, and audio requests fallback.
- Client-side storage manager (`lib/offline-storage.ts`) using standard IndexedDB (`perblinkist-offline-db`) to reliably store complete audio Blobs and metadata without CacheStorage size quota surprises.
- Service worker registration in `app/providers.tsx` or layout.
- Responsive download buttons in `BookDetailContent` and book cards.
- Offline status indicator (online/offline banner or badge).
