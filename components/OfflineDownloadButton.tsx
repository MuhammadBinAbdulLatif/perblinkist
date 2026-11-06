'use client';

import React, { useState, useEffect } from 'react';
import { Download, Check, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isBookDownloadedOffline,
  downloadBookOffline,
  deleteOfflineBook,
} from '@/lib/offline-storage';

interface OfflineDownloadButtonProps {
  book: {
    id: string;
    title: string;
    author: string | null;
    category?: string | null;
    durationSeconds: number | null;
    coverUrl: string | null;
    localCoverPath: string | null;
  };
  variant?: 'icon' | 'full';
  className?: string;
  onDownloadedChange?: (isDownloaded: boolean) => void;
}

export function OfflineDownloadButton({
  book,
  variant = 'full',
  className = '',
  onDownloadedChange,
}: OfflineDownloadButtonProps) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    isBookDownloadedOffline(book.id).then((downloaded) => {
      if (isMounted) {
        setIsDownloaded(downloaded);
        onDownloadedChange?.(downloaded);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [book.id, onDownloadedChange]);

  const handleToggleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    if (isDownloaded) {
      if (confirm(`Remove "${book.title}" from offline downloads?`)) {
        setIsLoading(true);
        await deleteOfflineBook(book.id);
        setIsDownloaded(false);
        setIsLoading(false);
        onDownloadedChange?.(false);
      }
      return;
    }

    try {
      setIsLoading(true);
      setProgress(5);
      await downloadBookOffline(book, (pct) => {
        setProgress(pct);
      });
      setIsDownloaded(true);
      onDownloadedChange?.(true);
    } catch (err) {
      console.error('[Offline] Error downloading book:', err);
      alert('Failed to download audio for offline listening. Please check your storage or network.');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={handleToggleDownload}
        disabled={isLoading}
        title={isDownloaded ? 'Downloaded for offline (click to remove)' : 'Download for offline listening'}
        className={`h-8 w-8 rounded-lg cursor-pointer ${
          isDownloaded
            ? 'text-emerald-400 hover:text-red-400 hover:bg-zinc-800'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
        } ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        ) : isDownloaded ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleToggleDownload}
      disabled={isLoading}
      className={`border-zinc-700 bg-zinc-950/60 text-xs rounded-xl h-11 sm:h-10 cursor-pointer gap-2 transition ${
        isDownloaded
          ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400 hover:bg-red-950/20 hover:text-red-400 hover:border-red-800/50'
          : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Downloading {progress > 0 ? `${progress}%` : ''}</span>
        </>
      ) : isDownloaded ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Downloaded Offline</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-zinc-400" />
          <span>Download for Offline</span>
        </>
      )}
    </Button>
  );
}
