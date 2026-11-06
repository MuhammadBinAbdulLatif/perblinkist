'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AuthorsPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');
  const [page, setPage] = useState<number>(1);
  const pageSize = 24;

  const authorsQuery = trpc.getAuthorsWithCounts.useQuery({
    search: search.trim() || undefined,
    sortBy,
    page,
    pageSize,
  });

  const authors = authorsQuery.data?.authors || [];
  const totalAuthors = authorsQuery.data?.totalAuthors || 0;
  const totalPages = authorsQuery.data?.totalPages || 1;
  const totalBooks = authorsQuery.data?.totalBooks || 0;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSortChange = (newSort: 'count' | 'name') => {
    setSortBy(newSort);
    setPage(1);
  };

  const formatHours = (secs: number) => {
    const hours = Math.round((secs / 3600) * 10) / 10;
    return hours > 0 ? `${hours} hrs` : `${Math.round(secs / 60)} mins`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 md:pb-24">
      <AppHeader
        variant="back"
        backHref="/"
        backLabel="Dashboard"
        trailingLabel={
          <span className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">{totalAuthors}</span> Authors
          </span>
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 sm:pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Authors Collection
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Browse writers across your {totalBooks} audio summaries. Click any author to explore their books.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search author..."
                value={search}
                onChange={handleSearchChange}
                className="bg-zinc-900 border-zinc-800 pl-8 text-xs text-zinc-200 placeholder:text-zinc-500 rounded-lg h-9"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 text-xs focus:outline-none h-9"
            >
              <option value="count">Most Summaries</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Authors Grid */}
        {authorsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card
                key={i}
                className="rounded-xl bg-zinc-900/60 border-zinc-800/80 p-5 flex flex-col justify-between animate-pulse"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 bg-zinc-800 rounded" />
                      <div className="h-2.5 w-16 bg-zinc-800/60 rounded" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="h-2.5 w-14 bg-zinc-800/60 rounded" />
                  <div className="h-3 w-3 bg-zinc-800 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : authors.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <Users className="w-12 h-12 text-zinc-700 mx-auto" />
            <h3 className="text-base font-semibold text-zinc-300">No authors found</h3>
            <p className="text-xs text-zinc-500">
              {search ? 'Try adjusting your search terms.' : 'No book summaries have identified authors yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {authors.map((author) => {
              // Generate a deterministic gradient or color initial
              const initials = author.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase();

              return (
                <Link
                  key={author.name}
                  href={`/authors/${encodeURIComponent(author.name)}`}
                  className="group block"
                >
                  <Card className="rounded-xl bg-zinc-900 border-zinc-800 p-4 sm:p-5 hover:border-zinc-700 hover:bg-zinc-850/60 transition flex flex-col justify-between h-full">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {/* Author initial badge */}
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center font-bold text-zinc-300 text-sm group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors shadow-inner shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-zinc-100 group-hover:text-white truncate">
                            {author.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                            <span className="text-emerald-400 font-semibold">
                              {author.count} {author.count === 1 ? 'summary' : 'summaries'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sample Cover thumbnails */}
                      {author.sampleBooks.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          {author.sampleBooks.map((sample) => (
                            <div
                              key={sample.id}
                              className="relative aspect-[3/4] w-12 rounded-md overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0"
                            >
                              {sample.localCoverPath || sample.coverUrl ? (
                                <img
                                  src={sample.localCoverPath || sample.coverUrl!}
                                  alt={sample.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                                  <BookOpen className="w-3.5 h-3.5 text-zinc-700" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {formatHours(author.totalDurationSeconds)}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400 group-hover:text-white font-medium transition-colors">
                        Explore
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
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
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs gap-1 cursor-pointer"
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
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs gap-1 cursor-pointer"
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
