# Plan: Global Persistent Audio Player Across Routes

## 1. Architectural Strategy
Move audio state and the `<audio>` element from individual page components into a global React Context provider:
1. **`lib/player-context.tsx`**:
   - `AudioPlayerProvider`: Mounts a single persistent HTML `<audio>` tag that lives at the root of the app.
   - Holds shared state: `currentBook`, `isPlaying`, `currentTime`, `duration`, `playbackRate`.
   - Methods: `playBook(book)`, `togglePlay()`, `seek(time)`, `skip(seconds)`, `setPlaybackRate(rate)`.
   - Handles automatic 10s progress syncing to tRPC (`updateProgress`).
2. **`components/GlobalAudioPlayer.tsx`**:
   - The persistent bottom floating dock rendered in `app/layout.tsx`.
   - Renders only when `currentBook` is set.
   - Shows cover thumbnail, title, author, play/pause, scrub slider, and speed switcher.
   - Clicking thumbnail or title navigates to `/book/[id]`.
3. **Refactor Individual Pages**:
   - In `app/page.tsx`: Replace local audio state and player with `useAudioPlayer()` hook.
   - In `app/book/[id]/page.tsx`: Connect page's centered player controls to the shared `useAudioPlayer()` hook so playing either place controls the exact same active audio session.
   - In `app/listen-later/page.tsx`: Clicking play loads the book into `useAudioPlayer().playBook(book)`.

## 2. File Changes
- Create `lib/player-context.tsx`
- Create `components/GlobalAudioPlayer.tsx`
- Update `app/layout.tsx` to wrap children with `AudioPlayerProvider` and mount `GlobalAudioPlayer`
- Update `app/page.tsx`
- Update `app/book/[id]/page.tsx`
- Update `app/listen-later/page.tsx`
