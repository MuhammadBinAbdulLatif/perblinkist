'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Pause, SkipForward, SkipBack, BookOpen } from 'lucide-react';
import { useAudioPlayer } from '@/lib/player-context';
import { Button } from '@/components/ui/button';

export function GlobalAudioPlayer() {
  const {
    currentBook,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    seek,
    skip,
    cyclePlaybackRate,
  } = useAudioPlayer();

  if (!currentBook) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    seek(percent * duration);
  };

  const totalDuration = duration || currentBook.durationSeconds || 0;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <aside
      className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 px-3 sm:px-6 pt-2.5 shadow-2xl"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
        {/* Mobile: full-width scrubber on top */}
        <div className="flex md:hidden items-center gap-2 text-[10px] text-zinc-500 w-full">
          <span className="tabular-nums w-9 shrink-0">{formatTime(currentTime)}</span>
          <div
            onClick={handleSeek}
            className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative touch-manipulation"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={totalDuration}
            aria-valuenow={currentTime}
            aria-label="Seek"
          >
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="tabular-nums w-9 shrink-0 text-right">{formatTime(totalDuration)}</span>
        </div>

        <div className="flex items-center gap-3 min-w-0 md:min-w-[200px] md:max-w-xs">
          <Link href={`/book/${currentBook.id}`} className="flex items-center gap-3 group min-w-0 flex-1">
            <div className="w-10 h-12 rounded overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0 group-hover:border-zinc-500 transition">
              {currentBook.localCoverPath || currentBook.coverUrl ? (
                <img
                  src={currentBook.localCoverPath || currentBook.coverUrl!}
                  alt={currentBook.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-zinc-600" />
                </div>
              )}
            </div>
            <div className="overflow-hidden min-w-0">
              <h4 className="text-sm font-medium text-white truncate group-hover:text-zinc-200">
                {currentBook.title}
              </h4>
              <p className="text-xs text-zinc-500 truncate">{currentBook.author || 'Unknown'}</p>
            </div>
          </Link>

          {/* Mobile rate + compact details */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={cyclePlaybackRate}
              className="text-xs text-zinc-400 hover:text-white border border-zinc-800 px-2 h-9 rounded cursor-pointer"
            >
              {playbackRate}x
            </Button>
          </div>
        </div>

        {/* Controls & (desktop) scrubber */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10)}
              className="h-10 w-10 sm:h-8 sm:w-8 text-zinc-400 hover:text-white cursor-pointer touch-manipulation"
              title="Rewind 10s"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <button
              onClick={togglePlay}
              className="w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center transition cursor-pointer shadow-sm touch-manipulation"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(30)}
              className="h-10 w-10 sm:h-8 sm:w-8 text-zinc-400 hover:text-white cursor-pointer touch-manipulation"
              title="Forward 30s"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="hidden md:flex w-full items-center gap-3 text-[11px] text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <div
              onClick={handleSeek}
              className="flex-1 h-1 bg-zinc-800 hover:h-2 rounded-full overflow-hidden cursor-pointer relative transition-all"
            >
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Desktop rate & details */}
        <div className="hidden md:flex items-center justify-end min-w-[120px] gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={cyclePlaybackRate}
            className="text-xs text-zinc-400 hover:text-white border border-zinc-800 px-2 py-0.5 rounded cursor-pointer"
          >
            {playbackRate}x
          </Button>
          <Link href={`/book/${currentBook.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
            >
              Details
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
