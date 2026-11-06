'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DownloadCloud,
  Play,
  Pause,
  Trash2,
  BookOpen,
  HardDrive,
  WifiOff,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAudioPlayer } from '@/lib/player-context';
import { OfflineHeader } from '@/components/OfflineHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getAllOfflineBooks,
  deleteOfflineBook,
  clearAllOfflineBooks,
  OfflineBookRecord,
} from '@/lib/offline-storage';

export default function DownloadsPage() {
  const [offlineBooks, setOfflineBooks] = useState<OfflineBookRecord[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const { playBook, currentBook, isPlaying, togglePlay } = useAudioPlayer();

  const loadOfflineData = async () => {
    try {
      const data = await getAllOfflineBooks();
      setOfflineBooks(data.books || []);
      setTotalBytes(data.totalSizeBytes || 0);
    } catch (err) {
      console.warn('[Offline] Error loading books from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 500ms safety timer ensures the skeleton resolves immediately even if IndexedDB is slow/empty
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    loadOfflineData().finally(() => {
      clearTimeout(timer);
    });

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
  };

  const handleDeleteItem = async (bookId: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Remove "${title}" from offline downloads?`)) {
      await deleteOfflineBook(bookId);
      loadOfflineData();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Delete all offline downloaded audiobooks from this device?')) {
      await clearAllOfflineBooks();
      loadOfflineData();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      <OfflineHeader isOffline={!isOnline} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Offline notice bar if network is down */}
        {!isOnline && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>You are currently offline. You can listen freely to all cached summaries below.</span>
            </div>
            <Badge variant="outline" className="border-amber-700 bg-amber-950 text-amber-400 text-[10px]">
              Offline Mode
            </Badge>
          </div>
        )}

        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 sm:pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-6 h-6 text-emerald-400" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Offline Downloads
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Summaries cached on this device for listening without cellular or internet access.
            </p>
          </div>

          {/* Storage metric pill */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs px-2.5 py-1">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span>{formatSize(totalBytes)} Cached</span>
            </Badge>
            {offlineBooks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-zinc-500 hover:text-red-400 hover:bg-red-950/20 h-8 px-2 cursor-pointer"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Offline Books Grid / List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card
                key={i}
                className="rounded-xl bg-zinc-900/60 border-zinc-800/80 p-4 flex items-center gap-4 animate-pulse"
              >
                <div className="w-14 h-18 rounded-lg bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 bg-zinc-800 rounded" />
                  <div className="h-2.5 w-1/4 bg-zinc-800/60 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : offlineBooks.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center rounded-2xl flex flex-col items-center gap-4">
            <DownloadCloud className="w-12 h-12 text-zinc-700" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-300">No offline downloads yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                Open any audiobook detail page and tap &quot;Download for Offline&quot; to save it directly into your device storage for flights or trips.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 mt-2">
                Browse Library
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {offlineBooks.map((book) => {
              const isThisBookPlaying = currentBook?.id === book.id && isPlaying;
              const durationMin = book.durationSeconds ? Math.round(book.durationSeconds / 60) : 15;

              return (
                <Card
                  key={book.id}
                  className="group rounded-xl bg-zinc-900 border-zinc-800 p-3 sm:p-4 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Cover art or fallback */}
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

                    {/* Metadata */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/20 text-emerald-400 text-[10px] px-1.5 py-0">
                          Available Offline
                        </Badge>
                        {book.category && (
                          <span className="text-[10px] text-zinc-500 font-medium">
                            • {book.category}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 ml-auto hidden sm:inline">
                          {formatSize(book.sizeBytes)}
                        </span>
                      </div>

                      <Link href={`/book/${book.id}`}>
                        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white line-clamp-1 hover:underline">
                          {book.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="truncate">{book.author || 'Unknown Author'}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {durationMin}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Player & Action Controls */}
                  <div className="flex items-center justify-end sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (currentBook?.id === book.id) {
                          togglePlay();
                        } else {
                          playBook({
                            id: book.id,
                            title: book.title,
                            author: book.author,
                            coverUrl: book.coverUrl,
                            localCoverPath: book.localCoverPath,
                            durationSeconds: book.durationSeconds,
                            category: book.category,
                          });
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
                          <span>Play Offline</span>
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
                      onClick={(e) => handleDeleteItem(book.id, book.title, e)}
                      title="Remove download"
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
