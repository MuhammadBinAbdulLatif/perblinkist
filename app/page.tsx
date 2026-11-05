'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  BookOpen,
  Search,
  FolderSync,
  LogOut,
  User as UserIcon,
  Bookmark,
  Sparkles,
  Flame,
  Shuffle,
  Clock,
  Library,
  ChevronRight,
  TrendingUp,
  RefreshCcw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { AuthScreen } from '@/components/AuthScreen';
import { Logo } from '@/components/Logo';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { currentBook, isPlaying, playBook } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');

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

  const searchQueryHook = trpc.searchBooks.useQuery(
    { query: searchQuery, limit: 18 },
    { enabled: searchQuery.trim().length > 0 }
  );

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-24">
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

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={20} className="text-white" />
            <span className="text-base font-semibold tracking-tight text-white">
              PerBlinkist
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Link href="/books">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-300 hover:text-white hover:bg-zinc-900 gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Library className="w-3.5 h-3.5" />
                <span>Browse All Books</span>
              </Button>
            </Link>

            <Link href="/listen-later">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 gap-1.5 text-xs cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Listen Later</span>
              </Button>
            </Link>
          </div>

          <GlobalSearchBar />

          <div className="flex items-center gap-2 text-sm">
            {isRateLimited && (
              <Badge variant="outline" className="border-amber-700/50 bg-amber-950/40 text-amber-400 text-xs px-2.5 py-1">
                Cooldown: {rateLimitRemainingSeconds}s
              </Badge>
            )}

            {/* Reset Rate Limit — shown when rate limited or there are stuck books */}
            {currentUser && (scanStats?.totalRateLimited ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetRateLimitMutation.mutate()}
                disabled={resetRateLimitMutation.isPending}
                title="Clear rate limit cooldown and retry stuck books"
                className="border border-amber-800/50 bg-amber-950/30 hover:bg-amber-900/40 text-amber-400 hover:text-amber-300 cursor-pointer text-xs gap-1.5"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${resetRateLimitMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Reset Cooldown</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerScanMutation.mutate()}
              disabled={isScanning}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer text-xs"
            >
              <FolderSync className={`w-3.5 h-3.5 mr-1.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>
                {scanStats?.status === 'indexing'
                  ? 'Indexing Files...'
                  : scanStats?.status === 'enriching'
                  ? `Batching (${scanStats.totalEnriched}/${scanStats.totalIndexed})`
                  : 'Sync Library'}
              </span>
            </Button>

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <Badge variant="secondary" className="bg-zinc-900 border-zinc-800 text-zinc-300 font-medium">
                  <UserIcon className="w-3 h-3 mr-1 text-zinc-400" />
                  <span>{currentUser.username}</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logoutMutation.mutate()}
                  title="Sign Out"
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content & Right-Column Categories Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* If Search is Active */}
        {searchQuery.trim().length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-xl font-bold text-white">
                Search Results for &quot;{searchQuery}&quot;
              </h2>
              <span className="text-xs text-zinc-400">
                {searchQueryHook.data?.length || 0} books found
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {searchQueryHook.data?.map((book) => (
                <BookShelfCard key={book.id} book={book} onPlay={() => playBook(book)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 9 Columns: Spotlight & Curated Shelves */}
            <div className="lg:col-span-9 space-y-12">
              {/* Spotlight Pick of the Day */}
              {spotlightBook && (
                <Card className="relative overflow-hidden rounded-2xl bg-zinc-900 border-zinc-800 p-8 md:p-10 text-zinc-100 shadow-2xl">
                  <div className="relative z-10 max-w-2xl space-y-4">
                    <Badge variant="outline" className="border-zinc-700 bg-zinc-800/80 text-zinc-300 text-[10px] tracking-wider uppercase font-medium">
                      Featured Pick of the Day
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                      {spotlightBook.title}
                    </h1>
                    <p className="text-base text-zinc-400">
                      by <span className="text-zinc-200 font-medium">{spotlightBook.author || 'Unknown'}</span>
                    </p>
                    <p className="text-sm text-zinc-300/90 line-clamp-3 leading-relaxed">
                      {spotlightBook.synopsis ||
                        'Key audio takeaways and insights summarized for rapid learning. Start listening immediately.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-3">
                      <Button
                        onClick={() => playBook(spotlightBook)}
                        className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold px-5 rounded-xl cursor-pointer gap-2"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        <span>Play Summary</span>
                      </Button>

                      <Link href={`/book/${spotlightBook.id}`}>
                        <Button
                          variant="outline"
                          className="border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-800 rounded-xl cursor-pointer"
                        >
                          View Details
                        </Button>
                      </Link>

                      <Link href="/books">
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
              )}

              {/* Shelf 1: Continue Listening (up to 10 in-progress books) */}
              {continueListeningQuery.data && continueListeningQuery.data.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-lg font-bold text-white tracking-tight">Continue Listening</h2>
                    </div>
                    <span className="text-xs text-zinc-500">Pick up where you left off</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h2 className="text-lg font-bold text-white tracking-tight">Trending in Your Collection</h2>
                    <Badge variant="outline" className="border-amber-700/40 bg-amber-950/30 text-amber-400 text-[10px] ml-1">
                      Bestsellers matched
                    </Badge>
                  </div>
                  <Link href="/books?sortBy=recent" className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                    <span>View all</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {trendingShelfQuery.data?.slice(0, 10).map((book) => (
                    <BookShelfCard key={book.id} book={book} onPlay={() => playBook(book)} />
                  ))}
                </div>
              </section>

              {/* Shelf 3: Discover Something New (Randomized 10 Books with Re-shuffle) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h2 className="text-lg font-bold text-white tracking-tight">Discover Something New</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => randomShelfQuery.refetch()}
                    className="text-xs text-zinc-400 hover:text-white gap-1 h-7 px-2 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Shuffle</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {randomShelfQuery.data?.slice(0, 10).map((book) => (
                    <BookShelfCard key={book.id} book={book} onPlay={() => playBook(book)} />
                  ))}
                </div>
              </section>

              {/* Shelf 4: Quick 15-Minute Listens */}
              {quickReadsQuery.data && quickReadsQuery.data.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <h2 className="text-lg font-bold text-white tracking-tight">Quick Listens (Under 20 Mins)</h2>
                    </div>
                    <span className="text-xs text-zinc-500">Perfect for commutes &amp; breaks</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {quickReadsQuery.data.slice(0, 10).map((book) => (
                      <BookShelfCard key={book.id} book={book} onPlay={() => playBook(book)} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right 3 Columns: Audiobook-Bay-style Genre Taxonomy & Stats Sidebar */}
            <aside className="lg:col-span-3 space-y-6 lg:border-l lg:border-zinc-800 lg:pl-6">
              {/* Library Statistics Card */}
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
                  <Button className="w-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold h-8 rounded-lg mt-1 cursor-pointer">
                    Browse All {totalBooksCount} Books
                  </Button>
                </Link>
              </Card>

              {/* Categories & Genres List (Audiobook Bay inspired) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Browse by Genre</h3>
                  <span className="text-[10px] text-zinc-500">{categories.length} Genres</span>
                </div>

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
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
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
