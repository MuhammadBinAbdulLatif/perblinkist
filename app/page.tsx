'use client';

import React, { useState } from 'react';
import { Play, Pause, Compass, Sparkles, BookOpen, Volume2, SkipForward, SkipBack, Search, FolderSync } from 'lucide-react';

interface BookSummary {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  durationMinutes: number;
  category: string;
  synopsis: string;
}

const mockFeatured: BookSummary = {
  id: '1',
  title: 'Atomic Habits',
  author: 'James Clear',
  coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
  durationMinutes: 18,
  category: 'Personal Growth',
  synopsis: 'An easy and proven way to build good habits and break bad ones with tiny 1% daily changes.'
};

const mockBooks: BookSummary[] = [
  {
    id: '1',
    title: 'Atomic Habits',
    author: 'James Clear',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    durationMinutes: 18,
    category: 'Productivity',
    synopsis: 'Tiny changes, remarkable results.'
  },
  {
    id: '2',
    title: 'Deep Work',
    author: 'Cal Newport',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
    durationMinutes: 21,
    category: 'Productivity',
    synopsis: 'Rules for focused success in a distracted world.'
  },
  {
    id: '3',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
    durationMinutes: 25,
    category: 'Psychology',
    synopsis: 'The two systems that drive the way we think.'
  },
  {
    id: '4',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    coverUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=600',
    durationMinutes: 19,
    category: 'Finance',
    synopsis: 'Timeless lessons on wealth, greed, and happiness.'
  }
];

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBook, setCurrentBook] = useState<BookSummary | null>(mockFeatured);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
              className="w-full bg-slate-850/80 border border-slate-750 rounded-full pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs transition">
              <FolderSync className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rescan Directory</span>
            </button>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              Live Media Mount
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 pb-32 space-y-10">
        {/* Spotlight Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/20 p-8 md:p-10 shadow-xl shadow-emerald-950/20">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" /> Spotlight of the Day
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {mockFeatured.title}
            </h1>
            <p className="text-lg text-emerald-300 font-medium">by {mockFeatured.author}</p>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed line-clamp-3">
              {mockFeatured.synopsis}
            </p>

            <div className="pt-2 flex items-center gap-4">
              <button
                onClick={() => {
                  setCurrentBook(mockFeatured);
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-full transition shadow-lg shadow-emerald-500/25 active:scale-95"
              >
                {isPlaying && currentBook?.id === mockFeatured.id ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" /> Pause Summary
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" /> Listen ({mockFeatured.durationMinutes} min)
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Random Discoveries Carousel/Shelf */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Discover Something New</h2>
              <p className="text-xs text-slate-400">Randomized book summaries from your media folder</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {mockBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => {
                  setCurrentBook(book);
                  setIsPlaying(true);
                }}
                className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 p-4 hover:border-emerald-500/40 hover:bg-slate-850 transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-800">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      {book.category}
                    </span>
                    <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{book.author}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" /> {book.durationMinutes} min
                  </span>
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      {currentBook && (
        <aside className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-6 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            {/* Book Info */}
            <div className="flex items-center gap-3.5 min-w-[220px]">
              <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 shadow">
                <img
                  src={currentBook.coverUrl}
                  alt={currentBook.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-semibold text-white truncate">{currentBook.title}</h4>
                <p className="text-xs text-slate-400 truncate">{currentBook.author}</p>
              </div>
            </div>

            {/* Controls & Scrubber */}
            <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-4">
                <button className="text-slate-400 hover:text-white transition">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition shadow-md shadow-emerald-500/20"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
                <button className="text-slate-400 hover:text-white transition">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Progress track */}
              <div className="w-full flex items-center gap-3 text-[11px] text-slate-400">
                <span>04:12</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
                  <div className="h-full bg-emerald-500 rounded-full w-1/4" />
                </div>
                <span>{currentBook.durationMinutes}:00</span>
              </div>
            </div>

            {/* Extra Controls */}
            <div className="flex items-center gap-3 text-slate-400">
              <button className="text-xs font-semibold hover:text-white px-2 py-1 rounded bg-slate-800">
                1.0x
              </button>
              <Volume2 className="w-5 h-5 hover:text-white cursor-pointer" />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
