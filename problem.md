# Problem: Offline Architecture & Server-Down State Handling

## Summary of the Issue
When the PerBlinkist server is turned off (`Ctrl + C` or process shutdown) and the user opens the web application:
1. **Homepage (`/`)**: Stays stuck on the `"Verifying session..."` pulsing book screen and never transitions to the offline screen.
2. **Downloads Page (`/downloads`)**: When navigated to while the server is offline, the page shell loads from the service worker cache, but the list of downloaded books stays stuck in an infinite skeleton loading animation (3 pulsing placeholders), showing `0 MB Cached` and never displaying downloaded audiobooks or the empty state.
3. **Network Tab Evidence**:
   - In the DevTools screenshot, requests for Turbopack HMR / development chunks (`%5Bturbopack%5D_browser_dev_hmr-client...`, React DOM dev bundles) are intercepted by `sw.js` with `0 B` transferred and no completion, stalling JavaScript hydration and execution.

---

## Detailed Root Cause Analysis

### 1. Dev-Mode Bundles & Turbopack HMR Poisoning the Service Worker Cache
- The app was tested under `next dev` (or dev-built chunks).
- Next.js development mode relies on continuous WebSocket HMR connections and dynamically compiled Turbopack chunks (`/_next/static/chunks/...`, `dev-hmr-client...`).
- When `sw.js` is active during dev mode, it caches development chunk URLs that become invalid or unresolvable when the Node server terminates.
- In Next.js, service workers and PWA caching **must only cache production static output (`next build` / `next start`)** or must cleanly bypass dev chunks. Because the dev scripts fail to load/hydrate when the server stops, the React component tree halts in its initial SSR skeleton state (`isLoading = true`).

### 2. Provider-Level Query Blocking
- In `app/providers.tsx`:
  ```tsx
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <AudioPlayerProvider>
        {children}
        <GlobalAudioPlayer />
      </AudioPlayerProvider>
    </QueryClientProvider>
  </trpc.Provider>
  ```
- Components within `children` trigger tRPC hooks (`useQuery()`).
- In `app/page.tsx`:
  - `authStatusQuery.isLoading` starts as `true`.
  - Even if `isOnline` check is in place, `navigator.onLine` in Chromium returns `true` as long as the machine has a Wi-Fi/LAN interface connected, even if `localhost:3000` is completely stopped.
  - As a result, the code enters `if (authStatusQuery.isLoading && isOnline)` and remains there while waiting for the network timeout.

### 3. `/downloads` Page Hydration & IndexedDB Execution
- In `app/downloads/page.tsx`:
  - Initial state is `isLoading = true`.
  - The component calls `loadOfflineData()` inside `useEffect`.
  - Because Next.js client-side script chunks failed to fully evaluate or were blocked by failed HMR requests when the dev server went down, the `useEffect` never executed, leaving the initial skeleton state rendered permanently on screen.
  - Additionally, `AppHeader` on `/downloads` was importing and rendering header components that may have had dangling query listeners.

---

## What Needs to Be Addressed in the Next Session

1. **Service Worker Dev-Mode Guard**:
   - In `app/providers.tsx`, strictly enforce that the Service Worker is registered **only in production** (`process.env.NODE_ENV === 'production'`).
   - If running in development (`next dev`), `sw.js` should self-unregister and clear all caches so it does not intercept Turbopack HMR.

2. **Decouple `/downloads` Completely from the Server**:
   - `/downloads` must be a standalone offline-first client page.
   - Use a minimal offline header (`<OfflineHeader />`) that does not mount any search bar, tRPC queries, or user session lookups.
   - Initial state of `isLoading` should resolve immediately or fallback with a hard 500ms timeout:
     ```tsx
     useEffect(() => {
       let timer = setTimeout(() => setIsLoading(false), 500);
       getAllOfflineBooks().then((res) => {
         clearTimeout(timer);
         setOfflineBooks(res.books);
         setTotalBytes(res.totalSizeBytes);
         setIsLoading(false);
       });
     }, []);
     ```

3. **Homepage Offline Detection**:
   - Replace dependence on `navigator.onLine` with a quick ping/heartbeat or an explicit health-check probe:
     - If the probe fails or times out within 1.5 seconds, immediately force `isServerOffline = true`.
     - Never block the UI on `authStatusQuery.isLoading` if the heartbeat has timed out.

4. **Production Build Testing Requirement**:
   - Always test offline PWA functionality by running:
     ```bash
     pnpm run build
     pnpm run start
     ```
   - Clear existing browser Application cache (`DevTools > Application > Storage > Clear site data`) before running the offline simulation test to purge old poisoned worker caches.
