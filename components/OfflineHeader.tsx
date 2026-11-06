'use client';

import React from 'react';
import Link from 'next/link';
import { DownloadCloud, ArrowLeft, WifiOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Badge } from '@/components/ui/badge';

interface OfflineHeaderProps {
  isOffline?: boolean;
}

export function OfflineHeader({ isOffline = false }: OfflineHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <div className="hidden sm:flex items-center gap-2">
            <Logo size={18} className="text-white shrink-0" />
            <span className="text-sm font-semibold tracking-tight text-white">
              PerBlinkist
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOffline && (
            <Badge
              variant="outline"
              className="border-amber-700/60 bg-amber-950/40 text-amber-400 text-xs px-2.5 py-1 flex items-center gap-1.5"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </Badge>
          )}
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <DownloadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline">Offline Storage</span>
          </span>
        </div>
      </div>
    </header>
  );
}
