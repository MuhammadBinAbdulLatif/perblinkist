'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, BookOpen, Play, Clock, ArrowRight, Loader2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAudioPlayer } from '@/lib/player-context';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function GlobalSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { playBook } = useAudioPlayer();

  // Global keyboard shortcut: Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced server-side database search query
  const trimmedQuery = query.trim();
  const searchGlobalQuery = trpc.searchGlobal.useQuery(
    { query: trimmedQuery, limit: 6 },
    {
      enabled: trimmedQuery.length > 0,
      staleTime: 1000 * 30, // 30s cache
    }
  );

  const results = searchGlobalQuery.data?.items || [];
  const totalMatches = searchGlobalQuery.data?.totalMatches || 0;
  const isLoading = searchGlobalQuery.isLoading;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trimmedQuery) return;
    setIsOpen(false);
    router.push(`/books?search=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className || 'max-w-md'}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search library…"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="bg-zinc-900 border-zinc-800 pl-10 pr-9 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600 text-xs sm:text-sm h-10 md:h-9 rounded-lg"
          aria-label="Search library"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Database Search Results Dropdown Overlay */}
      {isOpen && trimmedQuery.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-zinc-850 animate-in fade-in-0 zoom-in-95 duration-100 max-h-[min(24rem,70vh)] sm:max-h-none">
          <div className="px-3.5 py-2 bg-zinc-900/60 flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              Database matches for &quot;<strong className="text-zinc-200">{trimmedQuery}</strong>&quot;
            </span>
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
            ) : (
              <span>{totalMatches} found</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-900/60">
            {isLoading && results.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching SQLite database...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No matching audiobooks in your library.
              </div>
            ) : (
              results.map((book) => (
                <div
                  key={book.id}
                  className="p-2.5 hover:bg-zinc-900 transition flex items-center justify-between gap-3 group"
                >
                  <Link
                    href={`/book/${book.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="w-9 h-11 rounded bg-zinc-900 border border-zinc-800 overflow-hidden flex-shrink-0">
                      {book.localCoverPath || book.coverUrl ? (
                        <img
                          src={book.localCoverPath || book.coverUrl || ''}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate">{book.author || 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                        <span className="text-zinc-400">{book.category || 'General'}</span>
                        {book.durationSeconds && (
                          <span className="flex items-center gap-0.5">
                            • <Clock className="w-2.5 h-2.5 ml-0.5" />
                            {Math.round(book.durationSeconds / 60)}m
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      playBook(book as any);
                    }}
                    className="h-7 w-7 rounded-md bg-zinc-800 text-zinc-300 hover:bg-white hover:text-zinc-950 transition cursor-pointer flex-shrink-0"
                    title="Play"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {totalMatches > 0 && (
            <button
              onClick={() => handleSubmit()}
              className="w-full px-3.5 py-2.5 bg-zinc-900/40 hover:bg-zinc-900 text-xs text-zinc-300 hover:text-white flex items-center justify-between transition cursor-pointer"
            >
              <span>View all {totalMatches} results in library catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
