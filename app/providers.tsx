'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { AudioPlayerProvider } from '@/lib/player-context';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error: any) => {
              // Never retry if server is offline / connection refused / fetch failed
              if (
                error?.message?.includes('fetch failed') ||
                error?.message?.includes('Failed to fetch') ||
                error?.message?.includes('NetworkError') ||
                error?.data?.httpStatus === 503 ||
                (typeof navigator !== 'undefined' && !navigator.onLine)
              ) {
                return false;
              }
              return failureCount < 1;
            },
            retryDelay: 800,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          fetch(url, options) {
            // Fast 2.5-second abort controller so offline detection is near-instant
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2500);

            return fetch(url, {
              ...options,
              signal: controller.signal,
            }).finally(() => clearTimeout(timer));
          },
        }),
      ],
    })
  );

  // Register PWA service worker in production; in development, unregister and clear caches
  // so Turbopack HMR and dev chunks are never poisoned.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            // If there is an updated worker waiting, activate it immediately
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          })
          .catch((err) => {
            console.warn('[PWA] Service worker registration failed:', err);
          });
      } else {
        // Dev mode: Unregister existing service workers and clear caches
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
      }
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AudioPlayerProvider>
          {children}
          <GlobalAudioPlayer />
        </AudioPlayerProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
