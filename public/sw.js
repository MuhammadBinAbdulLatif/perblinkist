// PerBlinkist Offline Service Worker
const CACHE_NAME = 'perblinkist-app-v6';

// Core routes and assets needed so the browser can boot, load CSS/icons,
// and directly access /downloads even when the backend/server is completely down.
const CRITICAL_PAGES = [
  '/',
  '/downloads',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.ico',
];

// Fetch with quick timeout helper to fail fast if backend is unreachable
function fetchWithTimeout(request, timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(request, { signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
}
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event: Pre-cache core app shell & the downloads page
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use individual caching with catch to avoid one 404 blocking the rest
      await Promise.all(
        CRITICAL_PAGES.map(async (pageUrl) => {
          try {
            const res = await fetch(pageUrl, { cache: 'no-cache' });
            if (res.ok) {
              await cache.put(pageUrl, res);
            }
          } catch (err) {
            console.warn('[SW] Could not pre-cache:', pageUrl, err);
          }
        })
      );
    })
  );
});

// Activate event: Clean up old caches immediately and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first with aggressive offline fallbacks
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and non-http(s) requests
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never cache or interfere with development/HMR bundles, web sockets, or hot updates
  if (
    url.pathname.includes('turbopack') ||
    url.pathname.includes('_next/webpack-hmr') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // Media streams & downloads: bypass service worker cache since audio Blobs are
  // managed specifically by IndexedDB for quota reliability and range support.
  if (url.pathname.startsWith('/api/stream') || url.pathname.startsWith('/api/download')) {
    return;
  }

  // tRPC requests: Fast timeout (1.5s) so client detects offline state instantly
  if (url.pathname.startsWith('/api/trpc')) {
    event.respondWith(
      fetchWithTimeout(event.request, 1500).catch(() => {
        return new Response(
          JSON.stringify([
            {
              error: {
                json: {
                  message: 'Server offline. You can still access your offline downloads.',
                  code: -32000,
                  data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 503 },
                },
              },
            },
          ]),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // Next.js static production chunks, static bundles, and assets: Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/api/covers') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background
            fetch(event.request)
              .then((netRes) => {
                if (netRes && netRes.status === 200) {
                  cache.put(event.request, netRes);
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
        });
      })
    );
    return;
  }

  // HTML page navigations: Network-first with fast 1.5s timeout fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(event.request, 1500)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          
          // If navigating to /downloads specifically, return cached /downloads
          if (url.pathname === '/downloads' || url.pathname.startsWith('/downloads')) {
            const dlMatch = await cache.match('/downloads');
            if (dlMatch) return dlMatch;
          }

          // Check if exact request was previously cached
          const exactMatch = await cache.match(event.request);
          if (exactMatch) return exactMatch;

          // Otherwise, fall back to home or downloads
          const homeMatch = await cache.match('/');
          if (homeMatch) return homeMatch;

          const dlFallback = await cache.match('/downloads');
          if (dlFallback) return dlFallback;

          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // All other GET requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
