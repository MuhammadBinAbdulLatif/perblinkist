# Plan: PWA & Offline Listening System

## 1. Web App Manifest & App Icons
- Create `public/manifest.webmanifest`:
  - `name`: "PerBlinkist - Personal Audiobook Summaries"
  - `short_name`: "PerBlinkist"
  - `start_url`: "/"
  - `display`: "standalone"
  - `background_color`: "#09090b"
  - `theme_color`: "#09090b"
  - Icons: SVGs and PNG sizes (192x192, 512x512) and maskable icons.
- Add manifest link and meta tags in `app/layout.tsx` (`apple-touch-icon`, `theme-color`, `mobile-web-app-capable`).

## 2. IndexedDB Offline Storage Client (`lib/offline-storage.ts`)
- Use native `indexedDB` API with a lightweight typed helper.
- Database: `perblinkist-offline-db` (v1)
- Object Store: `offline_books`
  - Key: `bookId`
  - Record:
    ```ts
    {
      id: string;
      title: string;
      author: string | null;
      category: string | null;
      durationSeconds: number | null;
      coverUrl: string | null;
      coverBlob?: Blob;
      coverDataUrl?: string;
      audioBlob: Blob;
      sizeBytes: number;
      savedAt: number;
    }
    ```
- Methods:
  - `saveBookOffline(book, onProgress)`: fetches audio blob via `/api/download/[id]` or `/api/stream/[id]` and cover, stores in IndexedDB.
  - `removeBookOffline(bookId)`: deletes record from IndexedDB and revokes any blob URLs.
  - `isBookOffline(bookId)`: returns boolean.
  - `getOfflineBook(bookId)`: returns record with audio Blob.
  - `getAllOfflineBooks()`: returns array of saved books with metadata and total size.
  - `getOfflineAudioUrl(bookId)`: creates and caches `URL.createObjectURL(record.audioBlob)`.

## 3. Audio Player Integration (`lib/player-context.tsx`)
- When `playBook(book)` is called:
  - First check `getOfflineAudioUrl(book.id)`.
  - If available (downloaded offline), set `audioRef.current.src = localBlobUrl`.
  - Otherwise fall back to `/api/stream/${book.id}`.
- This ensures offline playback functions with zero network access and no 404/network errors.

## 4. Service Worker (`public/sw.js`)
- Standard cache-first / network-first service worker for static assets (HTML shell, CSS, JS, fonts).
- Network listener & offline detection support.
- Registered safely in `app/providers.tsx` during browser idle time.

## 5. UI Components & Pages
- `components/OfflineDownloadButton.tsx`:
  - Shows download state: un-downloaded (download icon), downloading (spinner + progress), downloaded (green checkmark or trash icon).
- Add download button to `app/book/[id]/page.tsx`.
- Create `/downloads` page (`app/downloads/page.tsx`):
  - Displays list of offline downloaded audiobooks.
  - Displays total offline storage used (e.g. 142 MB).
  - Ability to play directly offline, or delete individual / all downloads.
- Header update: Add `/downloads` link in desktop header and mobile drawer.
