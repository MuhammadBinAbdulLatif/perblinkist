'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { getOfflineAudioUrl } from '@/lib/offline-storage';

export interface PlayingBook {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  localCoverPath: string | null;
  durationSeconds: number | null;
  category?: string | null;
  playbackPosition?: number;
}

interface AudioPlayerContextType {
  currentBook: PlayingBook | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  playBook: (book: PlayingBook) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  skip: (seconds: number) => void;
  changePlaybackRate: (rate: number) => void;
  cyclePlaybackRate: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBook, setCurrentBook] = useState<PlayingBook | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const updateProgressMutation = trpc.updateProgress.useMutation();

  const playBook = (book: PlayingBook) => {
    if (currentBook?.id === book.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    setCurrentBook(book);
    setIsPlaying(true);

    if (audioRef.current) {
      const initialPos = book.playbackPosition || 0;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.currentTime = initialPos;
      setCurrentTime(initialPos);

      // Check if book has an offline cached audio Blob
      getOfflineAudioUrl(book.id)
        .then((offlineUrl) => {
          if (audioRef.current) {
            audioRef.current.src = offlineUrl || `/api/stream/${book.id}`;
            audioRef.current.play().catch(console.error);
          }
        })
        .catch(() => {
          if (audioRef.current) {
            audioRef.current.src = `/api/stream/${book.id}`;
            audioRef.current.play().catch(console.error);
          }
        });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentBook) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const seek = (newTime: number) => {
    if (!audioRef.current || !currentBook) return;
    const clamped = Math.max(0, Math.min(duration || 0, newTime));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
    if (typeof navigator === 'undefined' || navigator.onLine) {
      updateProgressMutation.mutate({
        id: currentBook.id,
        playbackPosition: clamped,
      });
    }
  };

  const skip = (deltaSeconds: number) => {
    if (!audioRef.current || !currentBook) return;
    const clamped = Math.max(0, Math.min(duration || 0, audioRef.current.currentTime + deltaSeconds));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
    if (typeof navigator === 'undefined' || navigator.onLine) {
      updateProgressMutation.mutate({
        id: currentBook.id,
        playbackPosition: clamped,
      });
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    changePlaybackRate(nextRate);
  };

  // Sync progress every 10 seconds while playing (only when online)
  useEffect(() => {
    if (!isPlaying || !currentBook) return;
    const interval = setInterval(() => {
      if (audioRef.current && (typeof navigator === 'undefined' || navigator.onLine)) {
        updateProgressMutation.mutate({
          id: currentBook.id,
          playbackPosition: audioRef.current.currentTime,
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, currentBook?.id]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentBook,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        playBook,
        togglePlay,
        pause,
        resume,
        seek,
        skip,
        changePlaybackRate,
        cyclePlaybackRate,
      }}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (currentBook) {
            updateProgressMutation.mutate({ id: currentBook.id, isCompleted: true });
          }
        }}
      />
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
