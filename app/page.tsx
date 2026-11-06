'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play,
  BookOpen,
  Sparkles,
  Flame,
  Shuffle,
  Clock,
  Library,
  ChevronRight,
  Loader2,
  WifiOff,
  DownloadCloud,
  ArrowRight,
} from 'lucide-react';
import { getAllOfflineBooks, OfflineBookRecord } from '@/lib/offline-storage';
import { Logo } from '@/components/Logo';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { AuthScreen } from '@/components/AuthScreen';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { playBook } = useAudioPlayer();
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  // Hard safety timeout: If session verification takes more than 3.5s, treat as offline
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessionTimedOut(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Monitor online status & offline cached books
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      getAllOfflineBooks().then((res) => {
        setOfflineCount(res.books.length);
      });

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Authentication status query
  const authStatusQuery = trpc.auth.status.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      authStatusQuery.refetch();
    },
  });

  // Shelves & Curation queries
  const continueListeningQuery = trpc.getContinueListening.useQuery({ limit: 10 });
  const trendingShelfQuery = trpc.getTrendingShelf.useQuery({ limit: 10 });
  const randomShelfQuery = trpc.getRandomShelf.useQuery({ limit: 10 });
  const quickReadsQuery = trpc.getQuickReadsShelf.useQuery({ limit: 10 });
  const categoriesQuery = trpc.getCategoriesWithCounts.useQuery();

  const scanStatusQuery = trpc.getScanStatus.useQuery(undefined, {
    refetchInterval: (data) =>
      data.state.data?.status === 'indexing' ||
      data.state.data?.status === 'enriching' ||
      data.state.data?.isRateLimited
        ? 1500
        : 6000,
  });

  const triggerScanMutation = trpc.triggerScan.useMutation({
    onSuccess: () => {
      scanStatusQuery.refetch();
      continueListeningQuery.refetch();
      trendingShelfQuery.refetch();
      randomShelfQuery.refetch();
    },
  });

  const resetRateLimitMutation = trpc.resetRateLimit.useMutation({
    onSuccess: () => {
      scanStatusQuery.refetch();
    },
  });

  const isScanning =
    scanStatusQuery.data?.status === 'indexing' || scanStatusQuery.data?.status === 'enriching';
  const isRateLimited = scanStatusQuery.data?.isRateLimited ?? false;
  const rateLimitRemainingSeconds = scanStatusQuery.data?.rateLimitRemainingSeconds ?? 0;
  const scanStats = scanStatusQuery.data;
  const currentUser = authStatusQuery.data?.currentUser;
  const isInitialized = authStatusQuery.data?.initialized ?? true;

  // Spotlight book: first trending or first random book
  const spotlightBook = trendingShelfQuery.data?.[0] || randomShelfQuery.data?.[0] || null;

  const categories = categoriesQuery.data || [];
  const totalBooksCount = scanStats?.totalIndexed || 0;

  const scanStatusLabel =
    scanStats?.status === 'indexing'
      ? 'Indexing Files...'
      : scanStats?.status === 'enriching'
        ? `Batching (${scanStats.totalEnriched}/${scanStats.totalIndexed})`
        : 'Sync Library';

  const isServerOffline =
    !isOnline ||
    authStatusQuery.isError ||
    (sessionTimedOut && authStatusQuery.isLoading);

  // Prevent flash of login modal or content while validating user session (only when online)
  if (authStatusQuery.isLoading && !sessionTimedOut && isOnline && !authStatusQuery.isError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
              <Logo size={28} className="text-zinc-300 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  // If server is unreachable or user is offline, show dedicated Offline Mode screen
  if (isServerOffline) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
        <AppHeader
          variant="home"
          showSearch={false}
          trailingLabel={
            <Badge variant="outline" className="border-amber-700/60 bg-amber-950/40 text-amber-400 text-xs px-2.5 py-1 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </Badge>
          }
        />

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center justify-center text-center">
          <Card className="w-full bg-zinc-900/70 border-zinc-800 p-8 sm:p-12 rounded-3xl shadow-2xl flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-center text-amber-400 shadow-xl">
                <WifiOff className="w-10 h-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                <DownloadCloud className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Badge variant="outline" className="border-amber-800/50 bg-amber-950/30 text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
                Connection Unavailable
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                You&apos;re currently offline
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed mx-auto">
                The PerBlinkist server cannot be reached right now. You can still listen to all your downloaded audiobook summaries without an internet connection.
              </p>
            </div>

            {offlineCount > 0 ? (
              <div className="w-full pt-2 space-y-3">
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between text-xs text-zinc-300">
                  <span className="flex items-center gap-2">
                    <DownloadCloud className="w-4 h-4 text-emerald-400" />
                    <span>Saved Audiobooks</span>
                  </span>
                  <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-md">
                    {offlineCount} available
                  </span>
                </div>

                <Link href="/downloads" className="block w-full">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold h-12 rounded-xl text-sm gap-2 cursor-pointer shadow-lg shadow-emerald-950/50">
                    <DownloadCloud className="w-4 h-4 fill-current" />
                    <span>Go to Downloaded Books</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="w-full pt-2 space-y-3">
                <p className="text-xs text-zinc-500">
                  No summaries were downloaded offline before disconnecting.
                </p>
                <Link href="/downloads" className="block w-full">
                  <Button variant="outline" className="w-full border-zinc-800 bg-zinc-900 text-zinc-200 hover:text-white h-11 rounded-xl text-xs gap-2 cursor-pointer">
                    <span>View Downloads Shelf</span>
                  </Button>
                </Link>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs text-zinc-500 hover:text-zinc-300 gap-1.5 h-8"
            >
              <span>Retry connection</span>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      {/* Auth Screen Modal */}
      {(!currentUser || !isInitialized) && (
        <AuthScreen
          isInitialized={isInitialized}
          onSuccess={() => {
            authStatusQuery.refetch();
            continueListeningQuery.refetch();
            trendingShelfQuery.refetch();
            randomShelfQuery.refetch();
          }}
        />
      )}

      <AppHeader
        variant="home"
        username={currentUser?.username}
        onLogout={currentUser ? () => logoutMutation.mutate() : undefined}
        scan={
          currentUser
            ? {
                isScanning,
                isRateLimited,
                rateLimitRemainingSeconds,
                statusLabel: scanStatusLabel,
                showResetCooldown: (scanStats?.totalRateLimited ?? 0) > 0,
                onSync: () => triggerScanMutation.mutate(),
                onResetCooldown: () => resetRateLimitMutation.mutate(),
                syncPending: triggerScanMutation.isPending,
                resetPending: resetRateLimitMutation.isPending,
              }
            : undefined
        }
      />

      {/* Main Content & Right-Column Categories Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 9 Columns: Spotlight & Curated Shelves */}
            <div className="lg:col-span-9 space-y-10 sm:space-y-12">
              {/* Spotlight Pick of the Day */}
              {trendingShelfQuery.isLoading && randomShelfQuery.isLoading ? (
                <SpotlightSkeleton />
              ) : spotlightBook ? (
                <Card className="relative overflow-hidden rounded-2xl bg-zinc-900 border-zinc-800 p-5 sm:p-8 md:p-10 text-zinc-100 shadow-2xl">
                  <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
                    <Badge variant="outline" className="border-zinc-700 bg-zinc-800/80 text-zinc-300 text-[10px] tracking-wider uppercase font-medium">
                      Featured Pick of the Day
                    </Badge>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                      {spotlightBook.title}
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-400">
                      by <span className="text-zinc-200 font-medium">{spotlightBook.author || 'Unknown'}</span>
                    </p>
                    <p className="text-sm text-zinc-300/90 line-clamp-3 leading-relaxed">
                      {spotlightBook.synopsis ||
                        'Key audio takeaways and insights summarized for rapid learning. Start listening immediately.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 sm:pt-3">
                      <Button
                        onClick={() => playBook(spotlightBook)}
                        className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold px-5 h-11 sm:h-10 rounded-xl cursor-pointer gap-2 touch-manipulation"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        <span>Play Summary</span>
                      </Button>

                      <Link href={`/book/${spotlightBook.id}`}>
                        <Button
                          variant="outline"
                          className="border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-800 rounded-xl cursor-pointer h-11 sm:h-10"
                        >
                          View Details
                        </Button>
                      </Link>

                      <Link href="/books" className="hidden sm:inline-flex">
                        <Button
                          variant="ghost"
                          className="text-zinc-400 hover:text-white text-xs gap-1"
                        >
                          <span>Explore All {totalBooksCount} Books</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Spotlight Background Cover Blur */}
                  {spotlightBook.localCoverPath || spotlightBook.coverUrl ? (
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 hidden md:block overflow-hidden pointer-events-none">
                      <img
                        src={spotlightBook.localCoverPath || spotlightBook.coverUrl!}
                        alt={spotlightBook.title}
                        className="w-full h-full object-cover blur-sm"
                      />
                    </div>
                  ) : null}
                </Card>
              ) : null}

              {/* Shelf 1: Continue Listening (up to 10 in-progress books) */}
              {continueListeningQuery.data && continueListeningQuery.data.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Continue Listening</h2>
                    </div>
                    <span className="hidden sm:inline text-xs text-zinc-500 shrink-0">Pick up where you left off</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                    {continueListeningQuery.data.map((book) => {
                      const totalSec = book.durationSeconds || 900;
                      const progressPct = Math.min(100, Math.round((book.playbackPosition / totalSec) * 100));
                      const remainingMin = Math.max(1, Math.round((totalSec - book.playbackPosition) / 60));

                      return (
                        <Card
                          key={book.id}
                          className="group rounded-xl bg-zinc-900 border-zinc-800 p-3 hover:border-zinc-700 transition flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-850">
                              {book.localCoverPath || book.coverUrl ? (
                                <img
                                  src={book.localCoverPath || book.coverUrl!}
                                  alt={book.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-2 text-center">
                                  <BookOpen className="w-6 h-6 text-zinc-600 mb-1" />
                                  <span className="text-[10px] font-medium text-zinc-400 line-clamp-2">{book.title}</span>
                                </div>
                              )}
                              {/* Progress bar overlay at bottom of cover */}
                              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-950/80">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPct}%` }} />
                              </div>
                            </div>

                            <div>
                              <Link href={`/book/${book.id}`}>
                                <h3 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-white mt-1 hover:underline">
                                  {book.title}
                                </h3>
                              </Link>
                              <p className="text-[11px] text-zinc-400 line-clamp-1">{book.author || 'Unknown'}</p>
                              <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                                {remainingMin}m left ({progressPct}%)
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                            <Link href={`/book/${book.id}`} className="text-[10px] text-zinc-400 hover:text-white">
                              Details
                            </Link>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => playBook(book)}
                              className="h-6 w-6 rounded-md bg-white text-zinc-950 hover:bg-zinc-200 transition cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Shelf 2: Trending Worldwide (Cross-referenced with Google Books API) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Trending in Your Collection</h2>
                    <Badge variant="outline" className="hidden sm:inline-flex border-amber-700/40 bg-amber-950/30 text-amber-400 text-[10px] ml-1 shrink-0">
                      Bestsellers matched
                    </Badge>
                  </div>
                  <Link href="/books?sortBy=recent" className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 shrink-0">
                    <span className="hidden sm:inline">View all</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {trendingShelfQuery.isLoading ? (
                  <ShelfSkeleton />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                    {trendingShelfQuery.data?.slice(0, 10).map((book) => (
                      <BookShelfCard key={book.id} book={book} onPlay={() => playBook(book)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Shelf 3: Discover Something New (Randomized 10 Books with Re-shuffle) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Discover Something New</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => randomShelfQuery.refetch()}
                    className="text-xs text-zinc-400 hover:text-white gap-1 h-9 sm:h-7 px-2 cursor-pointer shrink-0 touch-manipulation"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Shuffle</span>
                  </Button>
                </div>

                {randomShelfQuery.isLoading ? (
                  <ShelfSkeleton />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                    {randomShelfQuery.data?.slice(0, 10).map((book) => (
                      <BookShelfCard key={book.id} book={book} onPlay={() => playBook(book)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Shelf 4: Quick 15-Minute Listens */}
              {quickReadsQuery.isLoading ? (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Quick Listens</h2>
                    </div>
                    <span className="hidden sm:inline text-xs text-zinc-500 shrink-0">Under 20 mins</span>
                  </div>
                  <ShelfSkeleton />
                </section>
              ) : quickReadsQuery.data && quickReadsQuery.data.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Quick Listens</h2>
                    </div>
                    <span className="hidden sm:inline text-xs text-zinc-500 shrink-0">Under 20 mins</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                    {quickReadsQuery.data.slice(0, 10).map((book) => (
                      <BookShelfCard key={book.id} book={book} onPlay={() => playBook(book)} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            {/* Genre sidebar — stacks under shelves on mobile */}
            <aside className="lg:col-span-3 space-y-6 lg:border-l lg:border-zinc-800 lg:pl-6 order-last">
              <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Your Library</span>
                  <Library className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">{totalBooksCount}</span>
                  <span className="text-xs text-zinc-400">total audiobooks</span>
                </div>
                <Link href="/books">
                  <Button className="w-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold h-11 sm:h-8 rounded-lg mt-1 cursor-pointer touch-manipulation">
                    Browse All {totalBooksCount} Books
                  </Button>
                </Link>
              </Card>

              {/* Mobile: horizontal genre chips */}
              <div className="lg:hidden space-y-2">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider px-0.5">Browse by Genre</h3>
                {categoriesQuery.isLoading ? (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-8 w-20 rounded-full bg-zinc-900 border border-zinc-800 animate-pulse shrink-0" />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                    <Link
                      href="/books"
                      className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
                    >
                      All ({totalBooksCount})
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat.name}
                        href={`/books?category=${encodeURIComponent(cat.name)}`}
                        className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 whitespace-nowrap"
                      >
                        {cat.name} ({cat.count})
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop: vertical genre list */}
              <div className="hidden lg:block space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Browse by Genre</h3>
                  <span className="text-[10px] text-zinc-500">
                    {categoriesQuery.isLoading ? '...' : `${categories.length} Genres`}
                  </span>
                </div>

                {categoriesQuery.isLoading ? (
                  <div className="space-y-2 py-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-7 w-full rounded-lg bg-zinc-900/60 border border-zinc-800/40 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                    <Link
                      href="/books"
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition group"
                    >
                      <span className="font-medium group-hover:underline">All Audiobooks</span>
                      <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 text-[10px] border border-zinc-800">
                        {totalBooksCount}
                      </Badge>
                    </Link>

                    {categories.map((cat) => (
                      <Link
                        key={cat.name}
                        href={`/books?category=${encodeURIComponent(cat.name)}`}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition group"
                      >
                        <span className="truncate pr-2 group-hover:underline">{cat.name}</span>
                        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800 bg-zinc-950 font-mono">
                          {cat.count}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
      </main>
    </div>
  );
}

function ShelfSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card
          key={i}
          className="rounded-xl bg-zinc-900/60 border-zinc-800/80 p-3 flex flex-col justify-between animate-pulse"
        >
          <div className="space-y-2">
            <div className="aspect-[3/4] w-full rounded-lg bg-zinc-800/60" />
            <div className="space-y-1.5 pt-1">
              <div className="h-2.5 w-14 bg-zinc-800/80 rounded" />
              <div className="h-3 w-4/5 bg-zinc-800 rounded" />
              <div className="h-2.5 w-1/2 bg-zinc-800/60 rounded" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-800/40 flex items-center justify-between">
            <div className="h-2.5 w-8 bg-zinc-800/60 rounded" />
            <div className="h-6 w-6 rounded-md bg-zinc-800/80" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function SpotlightSkeleton() {
  return (
    <Card className="rounded-2xl bg-zinc-900 border-zinc-800 p-5 sm:p-8 md:p-10 animate-pulse">
      <div className="max-w-2xl space-y-3 sm:space-y-4">
        <div className="h-4 w-32 bg-zinc-800 rounded" />
        <div className="h-8 sm:h-10 w-3/4 bg-zinc-800 rounded" />
        <div className="h-4 w-1/3 bg-zinc-800/70 rounded" />
        <div className="space-y-2 pt-2">
          <div className="h-3.5 w-full bg-zinc-800/60 rounded" />
          <div className="h-3.5 w-5/6 bg-zinc-800/60 rounded" />
        </div>
        <div className="flex items-center gap-3 pt-3">
          <div className="h-10 w-36 bg-zinc-800 rounded-xl" />
          <div className="h-10 w-28 bg-zinc-800/60 rounded-xl" />
        </div>
      </div>
    </Card>
  );
}

function BookShelfCard({ book, onPlay }: { book: any; onPlay: () => void }) {
  return (
    <Card className="group rounded-xl bg-zinc-900 border-zinc-800 p-3 hover:border-zinc-700 transition flex flex-col justify-between">
      <div className="space-y-2">
        <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-850 flex items-center justify-center">
          {book.localCoverPath || book.coverUrl ? (
            <img
              src={book.localCoverPath || book.coverUrl!}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-2 text-center">
              <BookOpen className="w-6 h-6 text-zinc-600 mb-1" />
              <span className="text-[10px] font-medium text-zinc-400 line-clamp-2">{book.title}</span>
            </div>
          )}
        </div>
        <div>
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-zinc-800 text-zinc-400">
            {book.category || 'General'}
          </Badge>
          <Link href={`/book/${book.id}`}>
            <h3 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-white mt-1 hover:underline">
              {book.title}
            </h3>
          </Link>
          <p className="text-[11px] text-zinc-400 line-clamp-1">{book.author || 'Unknown'}</p>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
        <span className="text-[10px]">
          {book.durationSeconds ? `${Math.round(book.durationSeconds / 60)}m` : '15m'}
        </span>
        <div className="flex items-center gap-1.5">
          <Link href={`/book/${book.id}`} className="text-[10px] text-zinc-400 hover:text-white">
            Details
          </Link>
          <Button
            size="icon"
            variant="ghost"
            onClick={onPlay}
            className="h-6 w-6 rounded-md bg-zinc-800 text-zinc-300 hover:bg-white hover:text-zinc-950 transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current ml-0.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
