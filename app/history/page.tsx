'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  History,
  Play,
  Pause,
  Trash2,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  const { playBook, currentBook, isPlaying, togglePlay } = useAudioPlayer();

  const historyQuery = trpc.getListeningHistory.useQuery({ filter });

  const clearHistoryMutation = trpc.clearListeningHistory.useMutation({
    onSuccess: () => {
      historyQuery.refetch();
    },
  });

  const books = historyQuery.data?.books || [];
  const stats = historyQuery.data?.stats;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Recently';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClearItem = (bookId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Remove this title from your listening history?')) {
      clearHistoryMutation.mutate({ bookId });
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear your entire listening history? (Playback progress will be reset).')) {
      clearHistoryMutation.mutate({ clearAll: true });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      <AppHeader
        variant="back"
        backHref="/"
        backLabel="Dashboard"
        trailingLabel={
          <span className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">{stats?.totalListened || 0}</span> Listened
          </span>
        }
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 sm:pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-400" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Listening History
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Track in-progress summaries and completed listens across your library.
            </p>
          </div>

          {/* Quick stats pills */}
          {stats && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs px-2.5 py-1">
                <Clock className="w-3 h-3 text-emerald-400 mr-1.5" />
                <span>{stats.inProgressCount} In Progress</span>
              </Badge>
              <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs px-2.5 py-1">
                <CheckCircle2 className="w-3 h-3 text-blue-400 mr-1.5" />
                <span>{stats.completedCount} Completed</span>
              </Badge>
              {books.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={clearHistoryMutation.isPending}
                  className="text-xs text-zinc-500 hover:text-red-400 hover:bg-red-950/20 h-8 px-2 cursor-pointer"
                >
                  Clear All
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-zinc-850 pb-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
            className={`text-xs rounded-full h-8 px-3 cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            All History ({stats?.totalListened || 0})
          </Button>
          <Button
            size="sm"
            variant={filter === 'in_progress' ? 'default' : 'ghost'}
            onClick={() => setFilter('in_progress')}
            className={`text-xs rounded-full h-8 px-3 cursor-pointer ${
              filter === 'in_progress'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            In Progress ({stats?.inProgressCount || 0})
          </Button>
          <Button
            size="sm"
            variant={filter === 'completed' ? 'default' : 'ghost'}
            onClick={() => setFilter('completed')}
            className={`text-xs rounded-full h-8 px-3 cursor-pointer ${
              filter === 'completed'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Completed ({stats?.completedCount || 0})
          </Button>
        </div>

        {/* History List */}
        {historyQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="rounded-xl bg-zinc-900/60 border-zinc-800/80 p-4 flex items-center gap-4 animate-pulse"
              >
                <div className="w-14 h-18 rounded-lg bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 bg-zinc-800 rounded" />
                  <div className="h-2.5 w-1/4 bg-zinc-800/60 rounded" />
                  <div className="h-2 w-full bg-zinc-850 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : books.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center rounded-2xl flex flex-col items-center gap-4">
            <History className="w-12 h-12 text-zinc-700" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-300">
                {filter === 'completed'
                  ? 'No completed audio summaries yet'
                  : filter === 'in_progress'
                  ? 'No summaries currently in progress'
                  : 'Your listening history is empty'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                Play any summary from your library, and your progress and completion status will be saved here automatically.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 mt-2">
                Explore Library
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {books.map((book) => {
              const totalSec = book.durationSeconds || 900;
              const progressPct = Math.min(100, Math.round((book.playbackPosition / totalSec) * 100));
              const remainingMin = Math.max(0, Math.round((totalSec - book.playbackPosition) / 60));
              const isThisBookPlaying = currentBook?.id === book.id && isPlaying;

              return (
                <Card
                  key={book.id}
                  className="group rounded-xl bg-zinc-900 border-zinc-800 p-3 sm:p-4 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Cover */}
                    <div className="relative aspect-[3/4] w-14 sm:w-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-850 shrink-0">
                      {book.localCoverPath || book.coverUrl ? (
                        <img
                          src={book.localCoverPath || book.coverUrl!}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                          <BookOpen className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                    </div>

                    {/* Book Metadata & Progress */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {book.isCompleted ? (
                          <Badge className="bg-emerald-950/60 border-emerald-800/60 text-emerald-400 text-[10px] gap-1 px-1.5 py-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0">
                            {progressPct}% listened
                          </Badge>
                        )}
                        {book.category && (
                          <span className="text-[10px] text-zinc-500 font-medium">
                            • {book.category}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 ml-auto hidden sm:inline">
                          Played {formatDate(book.lastPlayedAt)}
                        </span>
                      </div>

                      <Link href={`/book/${book.id}`}>
                        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white line-clamp-1 hover:underline">
                          {book.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-zinc-400 line-clamp-1">
                        {book.author ? (
                          <Link
                            href={`/authors/${encodeURIComponent(book.author)}`}
                            className="hover:underline hover:text-zinc-200"
                          >
                            {book.author}
                          </Link>
                        ) : (
                          'Unknown Author'
                        )}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                          <div
                            className={`h-full rounded-full transition-all ${
                              book.isCompleted ? 'bg-emerald-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${book.isCompleted ? 100 : progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>
                            {book.isCompleted
                              ? 'Finished'
                              : `${remainingMin} min remaining`}
                          </span>
                          <span>
                            Total: {Math.round(totalSec / 60)} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (currentBook?.id === book.id) {
                          togglePlay();
                        } else {
                          playBook(book);
                        }
                      }}
                      className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs h-9 px-3 rounded-lg cursor-pointer gap-1.5"
                    >
                      {isThisBookPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{book.isCompleted ? 'Listen Again' : 'Resume'}</span>
                        </>
                      )}
                    </Button>

                    <Link href={`/book/${book.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white text-xs h-9 px-3 rounded-lg cursor-pointer"
                      >
                        Details
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleClearItem(book.id, e)}
                      title="Remove from history"
                      className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
