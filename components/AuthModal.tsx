'use client';

import React, { useState } from 'react';
import { Sparkles, Shield, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface AuthModalProps {
  isInitialized: boolean;
  onSuccess: () => void;
}

export function AuthModal({ isInitialized, onSuccess }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Store cookie in browser
      document.cookie = data.cookie;
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || 'Authentication failed');
    },
  });

  const setupAdminMutation = trpc.auth.setupAdmin.useMutation({
    onSuccess: (data) => {
      document.cookie = data.cookie;
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || 'Setup failed');
    },
  });

  const isLoading = loginMutation.isPending || setupAdminMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    if (!isInitialized) {
      setupAdminMutation.mutate({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
      });
    } else {
      loginMutation.mutate({
        username: username.trim(),
        password,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      {/* Ambient background glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 border border-emerald-500/30 p-8 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl">
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center shadow-lg shadow-emerald-500/25 mb-2">
            <Sparkles className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {isInitialized ? 'Welcome to PerBlinkist' : 'First-Run Setup'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {isInitialized
              ? 'Enter your credentials to access your audio summary collection.'
              : 'Create your initial administrator account to protect your media server.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90 ml-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

          {!isInitialized && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90 ml-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isInitialized ? 'Enter password' : 'Create strong password (min 6 chars)'}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <span>{isInitialized ? 'Sign In' : 'Create Administrator'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 text-emerald-500/80" />
            <span>Encrypted with bcrypt & secure HTTP-only sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
