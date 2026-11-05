'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { AudioPlayerProvider } from '@/lib/player-context';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

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
