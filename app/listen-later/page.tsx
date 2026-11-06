'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Play,
  Pause,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function ListenLaterPage() {
  const { currentBook, isPlaying, playBook } = useAudioPlayer();
  const listenLaterQuery = trpc.getListenLaterBooks.useQuery();
  const toggleMutation = trpc.toggleListenLater.useMutation({
    onSuccess: () => {
      listenLaterQuery.refetch();
    },
  });

  const books = listenLaterQuery.data || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      <AppHeader
        variant="back"
        backHref="/"
        backLabel="Dashboard"
        trailingLabel={
          <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
            <Bookmark className="w-3.5 h-3.5 text-zinc-400" />
            Listen Later
          </span>
        }
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Your Saved Summaries</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Queued for your next listening sessions.
          </p>
        </div>

        {listenLaterQuery.isLoading ? (
          <div className="py-20 flex justify-center text-zinc-500">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center rounded-2xl flex flex-col items-center gap-4">
            <Bookmark className="w-12 h-12 text-zinc-700" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-300">Your queue is empty</h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                Explore your collection or discover new titles, and click &quot;Save to Listen Later&quot; on any audiobook.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 mt-2">
                Browse Library
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map((book) => (
              <Card
                key={book.id}
                className="group rounded-xl bg-zinc-900 border-zinc-800 p-3 hover:border-zinc-700 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-850 flex items-center justify-center">
                    {book.localCoverPath || book.coverUrl ? (
                      <img
                        src={book.localCoverPath || book.coverUrl || ''}
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
                    <Link
                      href={`/book/${book.id}`}
                      className="text-[10px] text-zinc-400 hover:text-white transition"
                    >
                      Details
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => playBook(book)}
                      className="h-6 w-6 rounded-md bg-zinc-800 text-zinc-300 hover:bg-white hover:text-zinc-950 transition cursor-pointer"
                      title={currentBook?.id === book.id && isPlaying ? 'Pause' : 'Play'}
                    >
                      {currentBook?.id === book.id && isPlaying ? (
                        <Pause className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleMutation.mutate({ bookId: book.id })}
                      className="h-6 w-6 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                      title="Remove from Listen Later"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
