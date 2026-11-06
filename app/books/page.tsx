'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

function BooksCatalogContent() {
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get('category') || 'All';
  const initialSearch = searchParams.get('search') || '';
  const [category, setCategory] = useState<string>(initialCategory);
  const [search, setSearch] = useState<string>(initialSearch);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'duration_asc' | 'duration_desc'>('recent');
  const [page, setPage] = useState<number>(1);

  const { playBook, currentBook, isPlaying } = useAudioPlayer();

  const paginatedQuery = trpc.getPaginatedBooks.useQuery({
    page,
    pageSize: 30,
    category: category === 'All' ? undefined : category,
    search: search.trim().length > 0 ? search : undefined,
    sortBy,
  });

  const categoriesQuery = trpc.getCategoriesWithCounts.useQuery();

  const data = paginatedQuery.data;
  const books = data?.books || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.totalCount || 0;

  const handleCategorySelect = (newCat: string) => {
    setCategory(newCat);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      <AppHeader
        variant="back"
        backHref="/"
        backLabel="Dashboard"
        trailingLabel={
          <span className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">{totalCount}</span> in library
          </span>
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {/* Header Title & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-800 pb-4 sm:pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              All Audiobooks ({totalCount})
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Page {page} of {totalPages} · 30 per page
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 shrink-0">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 sm:flex-none bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2.5 sm:py-1.5 text-zinc-200 text-xs focus:outline-none min-h-11 sm:min-h-0"
            >
              <option value="recent">Recently Added</option>
              <option value="title">Title (A-Z)</option>
              <option value="duration_asc">Shortest First</option>
              <option value="duration_desc">Longest First</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <Button
            size="sm"
            variant={category === 'All' ? 'default' : 'outline'}
            onClick={() => handleCategorySelect('All')}
            className={`text-xs rounded-full cursor-pointer h-9 sm:h-7 shrink-0 touch-manipulation ${
              category === 'All'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            All Genres
          </Button>
          {categoriesQuery.data?.slice(0, 15).map((cat) => (
            <Button
              key={cat.name}
              size="sm"
              variant={category === cat.name ? 'default' : 'outline'}
              onClick={() => handleCategorySelect(cat.name)}
              className={`text-xs rounded-full cursor-pointer h-9 sm:h-7 whitespace-nowrap shrink-0 touch-manipulation ${
                category === cat.name
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <span>{cat.name}</span>
              <span className="ml-1 text-[10px] opacity-60">({cat.count})</span>
            </Button>
          ))}
        </div>

        {/* 30 Books Grid */}
        {paginatedQuery.isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-zinc-700 mx-auto" />
            <h3 className="text-base font-semibold text-zinc-300">No audiobooks found</h3>
            <p className="text-xs text-zinc-500">Try adjusting your search query or genre filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {books.map((book) => (
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
                      View
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => playBook(book)}
                      className="h-6 w-6 rounded-md bg-zinc-800 text-zinc-300 hover:bg-white hover:text-zinc-950 transition cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8 border-t border-zinc-850">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center gap-1 text-xs px-2 text-zinc-400">
              <span>Page</span>
              <span className="font-semibold text-white">{page}</span>
              <span>of</span>
              <span className="font-semibold text-white">{totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BooksCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <BooksCatalogContent />
    </Suspense>
  );
}
