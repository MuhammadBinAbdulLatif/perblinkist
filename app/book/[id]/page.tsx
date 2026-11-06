'use client';

import React, { useState, useRef, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Download,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  BookOpen,
  Volume2,
  Sparkles,
  Info,
  Layers,
  FileAudio,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

function BookDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookId = resolvedParams.id;

  const {
    currentBook,
    isPlaying: isGlobalPlaying,
    currentTime,
    duration,
    playbackRate,
    playBook,
    togglePlay: globalTogglePlay,
    seek,
    skip,
    cyclePlaybackRate,
  } = useAudioPlayer();

  // Queries
  const bookQuery = trpc.getBookById.useQuery({ id: bookId });
  const recommendationsQuery = trpc.getRecommendations.useQuery({ bookId });
  const authStatusQuery = trpc.auth.status.useQuery();

  const toggleListenLaterMutation = trpc.toggleListenLater.useMutation({
    onSuccess: () => {
      bookQuery.refetch();
    },
  });

  const book = bookQuery.data;
  const isSaved = Boolean(book?.isSaved);
  const isThisBookPlaying = currentBook?.id === bookId;
  const isPlaying = isThisBookPlaying && isGlobalPlaying;

  const togglePlay = () => {
    if (!book) return;
    if (isThisBookPlaying) {
      globalTogglePlay();
    } else {
      playBook(book);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    seek(percent * duration);
  };

  const skipSeconds = (seconds: number) => {
    skip(seconds);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (bookQuery.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          <span>Loading summary details...</span>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4">
        <BookOpen className="w-12 h-12 text-zinc-600" />
        <h2 className="text-xl font-semibold">Audiobook summary not found</h2>
        <Link href="/">
          <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      <AppHeader
        variant="back"
        backHref="/"
        backLabel="Dashboard"
        trailingLabel={
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Bookmark className="w-3.5 h-3.5" />
            Detail
          </span>
        }
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Book Header Section */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Cover Art */}
          <div className="md:col-span-4 flex justify-center">
            <div className="relative aspect-[3/4] w-48 sm:w-64 max-w-full rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl border border-zinc-800">
              {book.localCoverPath || book.coverUrl ? (
                <img
                  src={book.localCoverPath || book.coverUrl || ''}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-900 to-zinc-800">
                  <BookOpen className="w-14 h-14 text-zinc-600 mb-3" />
                  <span className="text-base font-bold text-zinc-300">{book.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Book Info & Action Panel */}
          <div className="md:col-span-8 space-y-5 sm:space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300">
                  {book.category || 'Summary'}
                </Badge>
                {book.format && (
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 font-mono text-xs uppercase">
                    {book.format}
                  </Badge>
                )}
                {book.durationSeconds && (
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {Math.round(book.durationSeconds / 60)} min listen
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {book.title}
              </h1>

              {book.author && (
                <p className="text-lg text-zinc-400 font-medium">
                  By <span className="text-zinc-200">{book.author}</span>
                </p>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={togglePlay}
                size="lg"
                className="bg-white hover:bg-zinc-200 text-zinc-950 font-semibold px-6 gap-2 rounded-xl shadow-lg cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                <span>{isPlaying ? 'Pause Summary' : 'Listen Now'}</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => toggleListenLaterMutation.mutate({ bookId: book.id })}
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl cursor-pointer gap-2"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>In Listen Later</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-zinc-400" />
                    <span>Save to Listen Later</span>
                  </>
                )}
              </Button>

              <a href={`/api/download/${book.id}`} download>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl cursor-pointer gap-2"
                >
                  <Download className="w-4 h-4 text-zinc-400" />
                  <span>Download Audio</span>
                </Button>
              </a>
            </div>

            {/* Technical Metadata Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-800/80 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-zinc-500 block mb-0.5">Publisher</span>
                <span className="text-zinc-300 font-medium truncate block">{book.publisher || 'Independent'}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-zinc-500 block mb-0.5">Published Year</span>
                <span className="text-zinc-300 font-medium">{book.publishedYear || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-zinc-500 block mb-0.5">Audio Quality</span>
                <span className="text-zinc-300 font-medium">
                  {book.bitrate ? `${Math.round(book.bitrate / 1000)} kbps` : 'High'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-zinc-500 block mb-0.5">Status</span>
                <span className="text-zinc-300 font-medium">
                  {book.isCompleted ? 'Finished' : book.playbackPosition > 0 ? 'In Progress' : 'Unread'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Centered High-Fidelity Focused Audio Player */}
        <section className="w-full">
          <Card className="max-w-3xl mx-auto bg-zinc-900 border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                <span className="font-medium text-zinc-300">Audiobook Player</span>
              </div>
              <span>{book.format?.toUpperCase()} Stream (Lossless Seeking)</span>
            </div>

            {/* Time & Interactive Scrubber */}
            <div className="space-y-2">
              <div
                onClick={handleSeek}
                className="w-full h-2.5 bg-zinc-800 hover:h-3.5 rounded-full cursor-pointer relative overflow-hidden transition-all duration-150"
              >
                <div
                  className="h-full bg-white transition-all duration-100 rounded-full"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || book.durationSeconds || 0)}</span>
              </div>
            </div>

            {/* Centered Transport Controls */}
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipSeconds(-10)}
                title="Rewind 10 seconds"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-11 w-11 rounded-full cursor-pointer"
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              <Button
                onClick={togglePlay}
                size="icon"
                className="h-14 w-14 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipSeconds(30)}
                title="Forward 30 seconds"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-11 w-11 rounded-full cursor-pointer"
              >
                <SkipForward className="w-5 h-5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={cyclePlaybackRate}
                className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white text-xs px-2.5 py-1 rounded-lg ml-2"
              >
                {playbackRate}x
              </Button>
            </div>
          </Card>
        </section>

        {/* Book Synopsis & Deep Description */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Info className="w-5 h-5 text-zinc-400" />
            <h2 className="text-xl font-bold text-white">Summary Overview</h2>
          </div>
          <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-base space-y-4">
            {book.synopsis ? (
              <p className="whitespace-pre-line">{book.synopsis}</p>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-zinc-200 font-semibold text-base">
                    {book.title}
                    {book.author ? (
                      <span className="text-zinc-400 font-normal"> — {book.author}</span>
                    ) : null}
                  </p>
                  {(book.publishedYear || book.publisher) && (
                    <p className="text-sm text-zinc-500">
                      {[book.publisher, book.publishedYear].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed">
                  {book.enrichmentStatus === 'pending' || book.enrichmentStatus === 'rate_limited' ? (
                    <>
                      Synopsis is being fetched — metadata enrichment for this title is queued.
                      Hit <span className="text-zinc-200 font-medium">Sync Library</span> from the
                      dashboard to process pending books.
                    </>
                  ) : book.category && book.category !== 'General' ? (
                    <>
                      This is a{' '}
                      <span className="text-zinc-200 font-medium">{book.category}</span> audiobook
                      summary
                      {book.author ? (
                        <>
                          {' '}by{' '}
                          <span className="text-zinc-200 font-medium">{book.author}</span>
                        </>
                      ) : null}
                      {book.durationSeconds ? (
                        <>
                          {' '}— approximately{' '}
                          <span className="text-zinc-200 font-medium">
                            {Math.round(book.durationSeconds / 60)} minutes
                          </span>{' '}
                          of key ideas and insights distilled from the original work.
                        </>
                      ) : (
                        ', with key ideas distilled from the original work.'
                      )}
                      {' '}No extended synopsis was available from open book databases for this title.
                    </>
                  ) : (
                    <>
                      An audio summary
                      {book.author ? (
                        <>
                          {' '}by{' '}
                          <span className="text-zinc-200 font-medium">{book.author}</span>
                        </>
                      ) : null}
                      {book.durationSeconds ? (
                        <>
                          {' '}— approximately{' '}
                          <span className="text-zinc-200 font-medium">
                            {Math.round(book.durationSeconds / 60)} minutes
                          </span>{' '}
                          of distilled insights.
                        </>
                      ) : (
                        '.'
                      )}
                      {' '}No synopsis was found in open book databases for this title. Listen directly
                      using the player above.
                    </>
                  )}
                </p>

                {book.isbn && (
                  <p className="text-xs text-zinc-600 font-mono">ISBN: {book.isbn}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Recommended From Your Library */}
        <section className="space-y-5 pt-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Recommended from Your Library</h2>
            </div>
            <span className="text-xs text-zinc-500">Cross-referenced with open catalog</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {recommendationsQuery.data && recommendationsQuery.data.length > 0 ? (
              recommendationsQuery.data.map((rec) => (
                <Link key={rec.id} href={`/book/${rec.id}`} className="group block">
                  <div className="space-y-2">
                    <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                      {rec.localCoverPath || rec.coverUrl ? (
                        <img
                          src={rec.localCoverPath || rec.coverUrl || ''}
                          alt={rec.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                          <BookOpen className="w-6 h-6 text-zinc-600 mb-1" />
                          <span className="text-[10px] font-medium text-zinc-400 line-clamp-2">{rec.title}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white line-clamp-1">
                        {rec.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">{rec.author || 'Unknown'}</p>
                      <span className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5">{rec.matchReason}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm text-zinc-500">
                Discovering more recommendations as your library expands...
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function BookDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-400">
            <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
            <span>Loading summary details...</span>
          </div>
        </div>
      }
    >
      <BookDetailContent {...props} />
    </Suspense>
  );
}
