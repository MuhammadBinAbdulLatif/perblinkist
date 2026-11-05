'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Compass,
  Sparkles,
  BookOpen,
  Volume2,
  SkipForward,
  SkipBack,
  Search,
  FolderSync,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

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

  // tRPC queries & mutations
  const randomBooksQuery = trpc.getRandomBooks.useQuery({ limit: 8 });
  const recentBooksQuery = trpc.getRecentBooks.useQuery({ limit: 4 });
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
    },
  });

  const updateProgressMutation = trpc.updateProgress.useMutation();

  const isScanning = scanStatusQuery.data?.status === 'scanning';

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

  const displayedBooks = searchQuery.trim().length > 0
    ? searchQueryHook.data || []
    : randomBooksQuery.data || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              PerBlinkist
            </span>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search summaries by title, author, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-850 border border-slate-750 rounded-full pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <button
              onClick={() => triggerScanMutation.mutate()}
              disabled={isScanning}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs transition disabled:opacity-60"
            >
              <FolderSync className={`w-3.5 h-3.5 text-emerald-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning media...' : 'Rescan Directory'}</span>
            </button>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              tRPC + Next.js
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 pb-32 space-y-10">
        {/* Spotlight Hero Banner */}
        {spotlightBook && !searchQuery && (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/20 p-8 md:p-10 shadow-xl shadow-emerald-950/20">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5" /> Spotlight Pick
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {spotlightBook.title}
              </h1>
              <p className="text-lg text-emerald-300 font-medium">by {spotlightBook.author || 'Unknown Author'}</p>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed line-clamp-3">
                {spotlightBook.synopsis || 'Comprehensive bite-sized summary extracted from your personal media library.'}
              </p>

              <div className="pt-2 flex items-center gap-4">
                <button
                  onClick={() => togglePlay(spotlightBook)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-full transition shadow-lg shadow-emerald-500/25 active:scale-95"
                >
                  {isPlaying && currentBook?.id === spotlightBook.id ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" /> Pause Summary
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" /> Listen (
                      {Math.round((spotlightBook.durationSeconds || 900) / 60)} min)
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Discovery Shelf */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Discover Something New'}
              </h2>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? `Found ${displayedBooks.length} summaries`
                  : 'Randomized book summaries from your media directory'}
              </p>
            </div>
          </div>

          {randomBooksQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : displayedBooks.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl p-8 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-300">No audiobook summaries found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Place your audio summary files into the <code className="text-emerald-400">/media</code> folder and click &quot;Rescan Directory&quot; above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
              {displayedBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => togglePlay(book)}
                  className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 p-4 hover:border-emerald-500/40 hover:bg-slate-850 transition duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                      {book.localCoverPath || book.coverUrl ? (
                        <img
                          src={book.localCoverPath || book.coverUrl!}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center">
                          <BookOpen className="w-10 h-10 text-emerald-500/60 mb-2" />
                          <span className="text-xs font-bold text-slate-300 line-clamp-2">{book.title}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                        {book.category || 'General'}
                      </span>
                      <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition">
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{book.author || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />{' '}
                      {Math.round((book.durationSeconds || 900) / 60)} min
                    </span>
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      {currentBook && (
        <aside className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-6 py-3.5 shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            {/* Book Info */}
            <div className="flex items-center gap-3.5 min-w-[220px]">
              <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 shadow">
                {currentBook.localCoverPath || currentBook.coverUrl ? (
                  <img
                    src={currentBook.localCoverPath || currentBook.coverUrl!}
                    alt={currentBook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-950 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-semibold text-white truncate">{currentBook.title}</h4>
                <p className="text-xs text-slate-400 truncate">{currentBook.author || 'Unknown'}</p>
              </div>
            </div>

            {/* Controls & Scrubber */}
            <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => skipSeconds(-15)}
                  className="text-slate-400 hover:text-white transition"
                  title="Rewind 15s"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => togglePlay(currentBook)}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition shadow-md shadow-emerald-500/20"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={() => skipSeconds(30)}
                  className="text-slate-400 hover:text-white transition"
                  title="Forward 30s"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Progress track */}
              <div className="w-full flex items-center gap-3 text-[11px] text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <div
                  onClick={handleSeek}
                  className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative"
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Extra Controls */}
            <div className="flex items-center gap-3 text-slate-400">
              <button
                onClick={cyclePlaybackRate}
                className="text-xs font-semibold hover:text-white px-2 py-1 rounded bg-slate-800 transition"
              >
                {playbackRate}x
              </button>
              <Volume2 className="w-5 h-5 hover:text-white cursor-pointer" />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
