'use client';

import React, { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthScreenProps {
  isInitialized: boolean;
  onSuccess: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthScreen({ isInitialized, onSuccess }: AuthScreenProps) {
  // If instance is uninitialized, start at setup/signup. Otherwise default to 'signin'.
  const [mode, setMode] = useState<AuthMode>(isInitialized ? 'signin' : 'signup');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Forgot password flow state
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [promptedQuestion, setPromptedQuestion] = useState<string | null>(null);

  // Status & error tracking
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const statusQuery = trpc.auth.status.useQuery();
  const availableQuestions = statusQuery.data?.securityQuestions || [
    'What was the name of your first pet?',
    'In what city or town was your first job?',
    'What was your childhood nickname?',
    'What is your mother’s maiden name?',
    'What was the model of your first car?',
  ];

  // Set default question once loaded if empty
  React.useEffect(() => {
    if (!securityQuestion && availableQuestions.length > 0) {
      setSecurityQuestion(availableQuestions[0]);
    }
  }, [availableQuestions, securityQuestion]);

  // Mutations
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

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      document.cookie = data.cookie;
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || 'Registration failed');
    },
  });

  const getQuestionMutation = trpc.auth.getSecurityQuestion.useMutation({
    onSuccess: (data) => {
      setPromptedQuestion(data.question);
      setForgotStep(2);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'User not found or no security question set');
    },
  });

  const resetPasswordMutation = trpc.auth.resetPasswordWithSecurityAnswer.useMutation({
    onSuccess: (data) => {
      document.cookie = data.cookie;
      setSuccessMessage('Password reset successfully! Redirecting...');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    },
    onError: (err) => {
      setError(err.message || 'Password reset failed');
    },
  });

  const isLoading =
    loginMutation.isPending ||
    setupAdminMutation.isPending ||
    registerMutation.isPending ||
    getQuestionMutation.isPending ||
    resetPasswordMutation.isPending;

  const resetFormState = (newMode: AuthMode) => {
    setError(null);
    setSuccessMessage(null);
    setUsername('');
    setPassword('');
    setEmail('');
    setSecurityAnswer('');
    setNewPassword('');
    setForgotStep(1);
    setPromptedQuestion(null);
    setMode(newMode);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }
    loginMutation.mutate({ username: username.trim(), password });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }
    if (!isInitialized) {
      if (!securityQuestion || !securityAnswer.trim()) {
        setError('Please select a security question and provide an answer for account recovery.');
        return;
      }
      // First account setup (admin)
      setupAdminMutation.mutate({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        securityQuestion,
        securityAnswer: securityAnswer.trim(),
      });
    } else {
      // Regular user registration
      if (!securityQuestion || !securityAnswer.trim()) {
        setError('Please select a security question and provide an answer for account recovery.');
        return;
      }
      registerMutation.mutate({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        securityQuestion,
        securityAnswer: securityAnswer.trim(),
      });
    }
  };

  const handleForgotLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }
    getQuestionMutation.mutate({ username: username.trim() });
  };

  const handleForgotReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!securityAnswer.trim() || !newPassword) {
      setError('Please answer the security question and enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    resetPasswordMutation.mutate({
      username: username.trim(),
      securityAnswer: securityAnswer.trim(),
      newPassword,
    });
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
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 bg-zinc-950 overflow-y-auto">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <Logo size={20} className="text-white" />
            <span className="font-semibold text-base tracking-tight text-white">PerBlinkist</span>
          </div>

          {/* Mode Title & Description */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && (!isInitialized ? 'Setup Admin Account' : 'Create an Account')}
              {mode === 'forgot' && 'Recover Account'}
            </h1>
            <p className="text-sm text-zinc-400">
              {mode === 'signin' && 'Enter your credentials to access your audio summary collection.'}
              {mode === 'signup' &&
                (!isInitialized
                  ? 'Set up your master administrator account to initialize this media server.'
                  : 'Register a reader profile and set a security question for password recovery.')}
              {mode === 'forgot' &&
                (forgotStep === 1
                  ? 'Enter your username to look up your registered security question.'
                  : 'Answer your security question below to set a new password.')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-950/40 border border-red-900/60 text-red-300 text-xs font-normal">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs font-normal">
              {successMessage}
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Username</label>
                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="reader"
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => resetFormState('forgot')}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
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
                <span>Sign in</span>
              </Button>

              <div className="pt-2 text-center text-xs text-zinc-400">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => resetFormState('signup')}
                  className="font-medium text-zinc-100 hover:underline"
                >
                  Sign up
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGN UP / REGISTRATION FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Username</label>
                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="newreader"
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Email (Optional)</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reader@example.com"
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                />
              </div>

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

              {/* Security Questions Selection */}
              <div className="space-y-2 pt-1 border-t border-zinc-900">
                <label className="text-xs font-medium text-zinc-300">
                  Security Question {!isInitialized && '(Recommended)'}
                </label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  {availableQuestions.map((q) => (
                    <option key={q} value={q} className="bg-zinc-900 text-zinc-100">
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">
                  Security Answer {!isInitialized && '(Optional)'}
                </label>
                <Input
                  type="text"
                  required={isInitialized}
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Your answer (case-insensitive)"
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-white hover:bg-zinc-200 text-zinc-950 font-medium cursor-pointer"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-950 mr-2" />}
                <span>{isInitialized ? 'Create Account' : 'Initialize Instance'}</span>
              </Button>

              {isInitialized && (
                <div className="pt-2 text-center text-xs text-zinc-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => resetFormState('signin')}
                    className="font-medium text-zinc-100 hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </form>
          )}

          {/* 3. FORGOT PASSWORD FLOW */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {forgotStep === 1 ? (
                <form onSubmit={handleForgotLookup} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">Enter your Username</label>
                    <Input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="reader"
                      className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-white hover:bg-zinc-200 text-zinc-950 font-medium cursor-pointer"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-950 mr-2" />}
                    <span>Find Security Question</span>
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-4">
                  <div className="p-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs">
                    <span className="text-zinc-500 block mb-1">Security Question for @{username}:</span>
                    <span className="text-zinc-200 font-medium">{promptedQuestion}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">Your Answer</label>
                    <Input
                      type="text"
                      required
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Answer"
                      className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300">New Password</label>
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-white hover:bg-zinc-200 text-zinc-950 font-medium cursor-pointer"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-950 mr-2" />}
                    <span>Reset Password & Sign In</span>
                  </Button>
                </form>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => resetFormState('signin')}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign in
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-500 text-center">
            By proceeding, you agree to local data storage on your private instance.
          </p>
        </div>
      </div>
    </div>
  );
}
