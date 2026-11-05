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

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 px-6 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Book Info */}
        <div className="flex items-center gap-3 min-w-[200px] max-w-xs">
          <Link href={`/book/${currentBook.id}`} className="flex items-center gap-3 group">
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
            <div className="overflow-hidden">
              <h4 className="text-sm font-medium text-white truncate group-hover:text-zinc-200">
                {currentBook.title}
              </h4>
              <p className="text-xs text-zinc-500 truncate">{currentBook.author || 'Unknown'}</p>
            </div>
          </Link>
        </div>

        {/* Controls & Scrubber */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10)}
              className="h-8 w-8 text-zinc-400 hover:text-white cursor-pointer"
              title="Rewind 10s"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center transition cursor-pointer shadow-sm"
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
              className="h-8 w-8 text-zinc-400 hover:text-white cursor-pointer"
              title="Forward 30s"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress track */}
          <div className="w-full flex items-center gap-3 text-[11px] text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <div
              onClick={handleSeek}
              className="flex-1 h-1 bg-zinc-800 hover:h-2 rounded-full overflow-hidden cursor-pointer relative transition-all"
            >
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span>{formatTime(duration || currentBook.durationSeconds || 0)}</span>
          </div>
        </div>

        {/* Playback Rate & Options */}
        <div className="flex items-center justify-end min-w-[120px] gap-2">
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
