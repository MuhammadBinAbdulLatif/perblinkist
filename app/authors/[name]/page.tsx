'use client';

import React, { use, Suspense } from 'react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  Play,
  Clock,
  Bookmark,
  Sparkles,
  ChevronRight,
  BookmarkCheck,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function AuthorDetailContent({ params }: { params: Promise<{ name: string }> }) {
  const resolvedParams = use(params);
  const authorName = decodeURIComponent(resolvedParams.name);

  const { playBook, currentBook, isPlaying } = useAudioPlayer();

  const authorQuery = trpc.getAuthorDetails.useQuery({ name: authorName });

  const toggleListenLaterMutation = trpc.toggleListenLater.useMutation({
    onSuccess: () => {
      authorQuery.refetch();
    },
  });

  const author = authorQuery.data;
  const books = author?.books || [];

  const formatHours = (secs: number) => {
    const hours = Math.round((secs / 3600) * 10) / 10;
    return hours > 0 ? `${hours} hours` : `${Math.round(secs / 60)} minutes`;
  };

  const initials = authorName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      <AppHeader
        variant="back"
        backHref="/authors"
        backLabel="All Authors"
        trailingLabel={
          <span className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">{books.length}</span> {books.length === 1 ? 'Book' : 'Books'}
          </span>
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Author Profile Hero Banner */}
        {authorQuery.isLoading ? (
          <Card className="rounded-2xl bg-zinc-900 border-zinc-800 p-6 sm:p-8 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-48 bg-zinc-800 rounded" />
                <div className="h-4 w-32 bg-zinc-800/60 rounded" />
                <div className="h-3 w-64 bg-zinc-800/40 rounded" />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-zinc-800 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
              {/* Author Initial Graphic */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-zinc-800 to-zinc-900 border border-emerald-500/30 flex items-center justify-center font-extrabold text-white text-xl sm:text-2xl shadow-lg shrink-0">
                {initials}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-[10px] tracking-wide uppercase font-semibold">
                    Author Profile
                  </Badge>
                  {author?.categories.slice(0, 3).map((cat) => (
                    <Badge key={cat} variant="secondary" className="bg-zinc-800/80 text-zinc-300 text-[10px]">
                      {cat}
                    </Badge>
                  ))}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white truncate">
                  {authorName}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-zinc-500" />
                    <strong className="text-zinc-200">{author?.booksCount}</strong> summaries in your library
                  </span>
                  {author?.totalDurationSeconds ? (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      <strong className="text-zinc-200">{formatHours(author.totalDurationSeconds)}</strong> of audio insights
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Section: Books in your collection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>Available Summaries ({books.length})</span>
            </h2>
            <span className="text-xs text-zinc-400">Audio summaries in your mounted media</span>
          </div>

          {authorQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card
                  key={i}
                  className="rounded-xl bg-zinc-900/60 border-zinc-800/80 p-3 flex flex-col justify-between animate-pulse"
                >
                  <div className="space-y-2">
                    <div className="aspect-[3/4] w-full rounded-lg bg-zinc-800/60" />
                    <div className="space-y-1.5 pt-1">
                      <div className="h-3 w-4/5 bg-zinc-800 rounded" />
                      <div className="h-2.5 w-1/2 bg-zinc-800/60 rounded" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-300">No summaries found for this author</h3>
              <p className="text-xs text-zinc-500">
                You can add more audio files into your media directory and rescan anytime.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map((book) => {
                const isThisBookPlaying = currentBook?.id === book.id && isPlaying;

                return (
                  <Card
                    key={book.id}
                    className="group rounded-xl bg-zinc-900 border-zinc-800 p-3 hover:border-zinc-700 transition flex flex-col justify-between"
                  >
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
                        {/* Bookmark quick toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleListenLaterMutation.mutate({ bookId: book.id });
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white transition"
                        >
                          {book.isSaved ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div>
                        {book.category && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-zinc-800 text-zinc-400">
                            {book.category}
                          </Badge>
                        )}
                        <Link href={`/book/${book.id}`}>
                          <h3 className="text-xs font-semibold text-zinc-200 line-clamp-2 group-hover:text-white mt-1 hover:underline">
                            {book.title}
                          </h3>
                        </Link>
                        {book.publishedYear ? (
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            Published {book.publishedYear}
                          </span>
                        ) : null}
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
                          onClick={() => playBook(book)}
                          className="h-6 w-6 rounded-md bg-white text-zinc-950 hover:bg-zinc-200 transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AuthorDetailPage(props: { params: Promise<{ name: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-medium">Loading author details...</span>
        </div>
      }
    >
      <AuthorDetailContent {...props} />
    </Suspense>
  );
}
