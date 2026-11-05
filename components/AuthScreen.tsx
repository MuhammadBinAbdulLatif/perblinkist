'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthScreenProps {
  isInitialized: boolean;
  onSuccess: () => void;
}

export function AuthScreen({ isInitialized, onSuccess }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      document.cookie = data.cookie;
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || 'Invalid username or password');
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
    <div className="fixed inset-0 z-50 flex bg-zinc-950 text-zinc-100 font-sans">
      {/* Left Half: Editorial / Quotation (50% desktop split) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-zinc-900 border-r border-zinc-800">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 filter grayscale contrast-125"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1507842229451-7f01be7fe820?auto=format&fit=crop&q=80&w=1600")',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-2.5">
          <Logo size={22} className="text-white" />
          <span className="font-semibold text-lg tracking-tight text-white">PerBlinkist</span>
        </div>

        {/* Bottom Quotation */}
        <div className="relative z-10 max-w-lg space-y-4 mb-4">
          <blockquote className="text-2xl font-medium tracking-tight text-zinc-100 leading-relaxed font-serif">
            &ldquo;A reader lives a thousand lives before he dies. The man who never reads lives only one.&rdquo;
          </blockquote>
          <div>
            <div className="text-sm font-medium text-zinc-300">George R.R. Martin</div>
            <div className="text-xs text-zinc-500">A Dance with Dragons</div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-zinc-600">
          Personal Audiobook Summaries &bull; Self-Hosted
        </div>
      </div>

      {/* Right Half: Official Shadcn Form Components */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 bg-zinc-950">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <Logo size={20} className="text-white" />
            <span className="font-semibold text-base tracking-tight text-white">PerBlinkist</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {isInitialized ? 'Sign in' : 'Create Admin Account'}
            </h1>
            <p className="text-sm text-zinc-400">
              {isInitialized
                ? 'Enter your credentials to access your audio summary collection.'
                : 'Set up your master administrator account to initialize this media server.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-950/40 border border-red-900/60 text-red-300 text-xs font-normal">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Username</label>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
              />
            </div>

            {!isInitialized && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Email (Optional)</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-white hover:bg-zinc-200 text-zinc-950 font-medium cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-950 mr-2" />}
              <span>{isInitialized ? 'Sign in' : 'Create account'}</span>
            </Button>
          </form>

          <p className="text-xs text-zinc-500 text-center">
            By proceeding, you agree to local data storage on your private instance.
          </p>
        </div>
      </div>
    </div>
  );
}
