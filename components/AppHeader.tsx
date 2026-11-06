'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  FolderSync,
  Library,
  LogOut,
  Menu,
  RefreshCcw,
  User as UserIcon,
  X,
  ArrowLeft,
  Users,
  History,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type AppHeaderScanProps = {
  isScanning: boolean;
  isRateLimited: boolean;
  rateLimitRemainingSeconds: number;
  statusLabel: string;
  showResetCooldown: boolean;
  onSync: () => void;
  onResetCooldown: () => void;
  syncPending?: boolean;
  resetPending?: boolean;
};

export type AppHeaderProps = {
  variant?: 'home' | 'back';
  backHref?: string;
  backLabel?: string;
  trailingLabel?: React.ReactNode;
  username?: string | null;
  onLogout?: () => void;
  scan?: AppHeaderScanProps;
  showSearch?: boolean;
};

export function AppHeader({
  variant = 'home',
  backHref = '/',
  backLabel = 'Dashboard',
  trailingLabel,
  username,
  onLogout,
  scan,
  showSearch = true,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4">
          {/* Brand / Back */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {variant === 'back' ? (
              <Link
                href={backHref}
                className="flex items-center gap-1.5 sm:gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline sm:inline truncate max-w-[7rem] sm:max-w-none">
                  {backLabel}
                </span>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2.5 min-w-0">
                <Logo size={20} className="text-white shrink-0" />
                <span className="text-base font-semibold tracking-tight text-white truncate">
                  PerBlinkist
                </span>
              </Link>
            )}
          </div>

          {/* Desktop nav links (home) */}
          {variant === 'home' && (
            <nav className="hidden md:flex items-center gap-1 shrink-0">
              <Link href="/books">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:text-white hover:bg-zinc-900 gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Library className="w-3.5 h-3.5" />
                  <span>Browse Books</span>
                </Button>
              </Link>
              <Link href="/authors">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:text-white hover:bg-zinc-900 gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Authors</span>
                </Button>
              </Link>
              <Link href="/history">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-900 gap-1.5 text-xs cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                </Button>
              </Link>
              <Link href="/listen-later">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-900 gap-1.5 text-xs cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Listen Later</span>
                </Button>
              </Link>
            </nav>
          )}

          {/* Search — grows; may hide on very tight back headers via prop */}
          {showSearch && (
            <div className="flex-1 min-w-0">
              <GlobalSearchBar className="max-w-none md:max-w-md mx-auto md:mx-0" />
            </div>
          )}

          {!showSearch && <div className="flex-1" />}

          {/* Desktop trailing actions */}
          <div className="hidden md:flex items-center gap-2 text-sm shrink-0">
            {trailingLabel}
            {scan && <ScanActions scan={scan} />}
            {username && onLogout && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <Badge
                  variant="secondary"
                  className="bg-zinc-900 border-zinc-800 text-zinc-300 font-medium"
                >
                  <UserIcon className="w-3 h-3 mr-1 text-zinc-400" />
                  <span>{username}</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  title="Sign Out"
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 shrink-0 text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="absolute inset-y-0 right-0 w-[min(100%,20rem)] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Logo size={18} className="text-white" />
                <span className="text-sm font-semibold text-white">Menu</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-zinc-400 hover:text-white cursor-pointer"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <DrawerLink href="/books" onClick={closeMenu} icon={<Library className="w-4 h-4" />}>
                Browse All Books
              </DrawerLink>
              <DrawerLink href="/authors" onClick={closeMenu} icon={<Users className="w-4 h-4" />}>
                Browse Authors
              </DrawerLink>
              <DrawerLink href="/history" onClick={closeMenu} icon={<History className="w-4 h-4" />}>
                Listening History
              </DrawerLink>
              <DrawerLink
                href="/listen-later"
                onClick={closeMenu}
                icon={<Bookmark className="w-4 h-4" />}
              >
                Listen Later
              </DrawerLink>
              {variant === 'back' && (
                <DrawerLink href={backHref} onClick={closeMenu} icon={<ArrowLeft className="w-4 h-4" />}>
                  {backLabel}
                </DrawerLink>
              )}

              {trailingLabel && (
                <div className="px-3 py-2 text-xs text-zinc-400 border-t border-zinc-800 mt-3 pt-3">
                  {trailingLabel}
                </div>
              )}

              {scan && (
                <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2 px-1">
                  {scan.isRateLimited && (
                    <Badge
                      variant="outline"
                      className="border-amber-700/50 bg-amber-950/40 text-amber-400 text-xs px-2.5 py-1"
                    >
                      Cooldown: {scan.rateLimitRemainingSeconds}s
                    </Badge>
                  )}
                  {scan.showResetCooldown && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        scan.onResetCooldown();
                      }}
                      disabled={scan.resetPending}
                      className="w-full justify-start border border-amber-800/50 bg-amber-950/30 hover:bg-amber-900/40 text-amber-400 hover:text-amber-300 cursor-pointer text-xs gap-1.5 h-11"
                    >
                      <RefreshCcw
                        className={`w-3.5 h-3.5 ${scan.resetPending ? 'animate-spin' : ''}`}
                      />
                      <span>Reset Cooldown</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      scan.onSync();
                    }}
                    disabled={scan.isScanning || scan.syncPending}
                    className="w-full justify-start border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer text-xs h-11"
                  >
                    <FolderSync
                      className={`w-3.5 h-3.5 mr-1.5 ${scan.isScanning ? 'animate-spin' : ''}`}
                    />
                    <span>{scan.statusLabel}</span>
                  </Button>
                </div>
              )}
            </nav>

            {username && onLogout && (
              <div className="border-t border-zinc-800 p-3 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-zinc-900 border-zinc-800 text-zinc-300 font-medium flex-1 justify-start"
                >
                  <UserIcon className="w-3 h-3 mr-1 text-zinc-400" />
                  <span className="truncate">{username}</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onLogout();
                    closeMenu();
                  }}
                  title="Sign Out"
                  className="h-11 w-11 text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ScanActions({ scan }: { scan: AppHeaderScanProps }) {
  return (
    <>
      {scan.isRateLimited && (
        <Badge
          variant="outline"
          className="border-amber-700/50 bg-amber-950/40 text-amber-400 text-xs px-2.5 py-1"
        >
          Cooldown: {scan.rateLimitRemainingSeconds}s
        </Badge>
      )}
      {scan.showResetCooldown && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scan.onResetCooldown}
          disabled={scan.resetPending}
          title="Clear rate limit cooldown and retry stuck books"
          className="border border-amber-800/50 bg-amber-950/30 hover:bg-amber-900/40 text-amber-400 hover:text-amber-300 cursor-pointer text-xs gap-1.5"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${scan.resetPending ? 'animate-spin' : ''}`} />
          <span>Reset Cooldown</span>
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={scan.onSync}
        disabled={scan.isScanning || scan.syncPending}
        className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer text-xs"
      >
        <FolderSync className={`w-3.5 h-3.5 mr-1.5 ${scan.isScanning ? 'animate-spin' : ''}`} />
        <span>{scan.statusLabel}</span>
      </Button>
    </>
  );
}

function DrawerLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 h-11 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
    >
      <span className="text-zinc-500">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
