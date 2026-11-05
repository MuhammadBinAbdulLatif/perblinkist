'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  BookOpen,
  Volume2,
  SkipForward,
  SkipBack,
  Search,
  FolderSync,
  Loader2,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { AuthScreen } from '@/components/AuthScreen';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BookSummary {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  localCoverPath: string | null;
  durationSeconds: number | null;
  category: string | null;
  synopsis: string | null;
  playbackPosition: number;
}

export default function Home() {
  const [currentBook, setCurrentBook] = useState<BookSummary | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Authentication status query
  const authStatusQuery = trpc.auth.status.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      authStatusQuery.refetch();
    },
  });

  // tRPC queries & mutations
  const randomBooksQuery = trpc.getRandomBooks.useQuery({ limit: 8 });
  const searchQueryHook = trpc.searchBooks.useQuery(
    { query: searchQuery, limit: 12 },
    { enabled: searchQuery.trim().length > 0 }
  );

  const scanStatusQuery = trpc.getScanStatus.useQuery(undefined, {
    refetchInterval: (data) => (data.state.data?.status === 'scanning' ? 1000 : false),
  });

  const triggerScanMutation = trpc.triggerScan.useMutation({
    onSuccess: () => {
      scanStatusQuery.refetch();
      randomBooksQuery.refetch();
    },
  });

  const updateProgressMutation = trpc.updateProgress.useMutation();

  const isScanning = scanStatusQuery.data?.status === 'scanning';
  const currentUser = authStatusQuery.data?.currentUser;
  const isInitialized = authStatusQuery.data?.initialized ?? true;

  // Spotlight book: first random or featured
  const spotlightBook = randomBooksQuery.data?.[0] || null;

  // Audio setup
  const togglePlay = (book: BookSummary) => {
    if (currentBook?.id === book.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentBook(book);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = `/api/stream/${book.id}`;
        audioRef.current.currentTime = book.playbackPosition || 0;
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    if (currentBook) {
      updateProgressMutation.mutate({
        id: currentBook.id,
        playbackPosition: newTime,
      });
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  };

  // Sync progress occasionally
  useEffect(() => {
    if (!isPlaying || !currentBook) return;
    const interval = setInterval(() => {
      if (audioRef.current) {
        updateProgressMutation.mutate({
          id: currentBook.id,
          playbackPosition: audioRef.current.currentTime,
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, currentBook]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const displayedBooks =
    searchQuery.trim().length > 0 ? searchQueryHook.data || [] : randomBooksQuery.data || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* Formal Split-Screen Auth when unauthenticated */}
      {authStatusQuery.data && !currentUser && (
        <AuthScreen
          isInitialized={isInitialized}
          onSuccess={() => {
            authStatusQuery.refetch();
            randomBooksQuery.refetch();
          }}
        />
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          if (currentBook) {
            updateProgressMutation.mutate({ id: currentBook.id, isCompleted: true });
          }
        }}
      />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={20} className="text-white" />
            <span className="text-base font-semibold tracking-tight text-white">
              PerBlinkist
            </span>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search summaries by title, author, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800 pl-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-500"
            />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerScanMutation.mutate()}
              disabled={isScanning}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
            >
              <FolderSync className={`w-3.5 h-3.5 mr-1.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Syncing...' : 'Sync Library'}</span>
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 pb-32 space-y-10">
        {/* Spotlight Hero Banner */}
        {spotlightBook && !searchQuery && (
          <Card className="relative overflow-hidden rounded-xl bg-zinc-900 border-zinc-800 p-8 md:p-10 text-zinc-100">
            <div className="relative z-10 max-w-2xl space-y-3.5">
              <Badge variant="outline" className="border-zinc-700 bg-zinc-800/80 text-zinc-300 text-[10px] tracking-wider uppercase font-medium">
                Featured Summary
              </Badge>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
                {spotlightBook.title}
              </h1>
              <p className="text-base text-zinc-400 font-normal">by {spotlightBook.author || 'Unknown Author'}</p>
              <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">
                {spotlightBook.synopsis ||
                  'Comprehensive bite-sized summary extracted from your personal media library.'}
              </p>

              <div className="pt-2 flex items-center gap-4">
                <Button
                  onClick={() => togglePlay(spotlightBook)}
                  className="bg-white hover:bg-zinc-200 text-zinc-950 font-medium cursor-pointer shadow-sm"
                >
                  {isPlaying && currentBook?.id === spotlightBook.id ? (
                    <>
                      <Pause className="w-4 h-4 fill-current mr-2" /> Pause Summary
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current mr-2" /> Listen (
                      {Math.round((spotlightBook.durationSeconds || 900) / 60)} min)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Discovery Shelf */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Library Summaries'}
              </h2>
              <p className="text-xs text-zinc-500">
                {searchQuery
                  ? `Found ${displayedBooks.length} summaries`
                  : 'Curated audio summaries from your mounted directory'}
              </p>
            </div>
          </div>

          {randomBooksQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 text-zinc-600">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : displayedBooks.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl p-8 space-y-3">
              <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
              <h3 className="text-base font-medium text-zinc-300">No summaries found</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Place your audio summary files into the <code className="text-zinc-300">/media</code> folder and
                click &quot;Sync Library&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-5">
              {displayedBooks.map((book) => (
                <Card
                  key={book.id}
                  onClick={() => togglePlay(book)}
                  className="group cursor-pointer rounded-lg bg-zinc-900 border-zinc-800 p-3 hover:border-zinc-700 transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden bg-zinc-950 border border-zinc-850 flex items-center justify-center">
                      {book.localCoverPath || book.coverUrl ? (
                        <img
                          src={book.localCoverPath || book.coverUrl!}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-3 text-center">
                          <BookOpen className="w-8 h-8 text-zinc-600 mb-2" />
                          <span className="text-xs font-medium text-zinc-400 line-clamp-2">{book.title}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-zinc-800 text-zinc-400 uppercase tracking-wider font-normal">
                        {book.category || 'General'}
                      </Badge>
                      <h3 className="text-sm font-medium text-zinc-100 line-clamp-1 group-hover:text-white transition mt-1.5">
                        {book.title}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-1">{book.author || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                    <span>{Math.round((book.durationSeconds || 900) / 60)} min</span>
                    <div className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-300 group-hover:bg-white group-hover:text-zinc-950 transition flex items-center justify-center">
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      {currentBook && (
        <aside className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            {/* Book Info */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="w-10 h-12 rounded overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0">
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
                <h4 className="text-sm font-medium text-white truncate">{currentBook.title}</h4>
                <p className="text-xs text-zinc-500 truncate">{currentBook.author || 'Unknown'}</p>
              </div>
            </div>

            {/* Controls & Scrubber */}
            <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skipSeconds(-15)}
                  className="h-8 w-8 text-zinc-400 hover:text-white cursor-pointer"
                  title="Rewind 15s"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => togglePlay(currentBook)}
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
                  onClick={() => skipSeconds(30)}
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
                  className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative"
                >
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Extra Controls */}
            <div className="flex items-center gap-3 text-zinc-400">
              <Button
                variant="outline"
                size="sm"
                onClick={cyclePlaybackRate}
                className="h-7 text-xs font-medium hover:text-white px-2 py-0.5 bg-zinc-900 border-zinc-800 cursor-pointer"
              >
                {playbackRate}x
              </Button>
              <Volume2 className="w-4 h-4 hover:text-white cursor-pointer" />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
