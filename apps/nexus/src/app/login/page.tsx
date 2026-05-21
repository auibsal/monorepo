'use client';

import { Suspense, useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AlertTriangle } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();
  const searchParams = useSearchParams();

  // 1. Intercept URL errors from the API callbacks
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'invalid_auth_code') {
      setStatus('error');
      setErrorMessage('Your login link expired or was invalid. Please authenticate again.');
    } else if (errorParam) {
      setStatus('error');
      setErrorMessage(errorParam);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('success');
      // 2. Safely capture the intended destination to preserve deep-links
      // SECURITY: Validate 'next' to prevent DOM-based XSS (javascript:) and Open Redirects
      let next = searchParams.get('next') || '/';
      if (!next.startsWith('/') || next.startsWith('//')) {
        next = '/';
      }
      window.location.href = next;
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-8">
      <div className="space-y-3">
        {/* Swapped hardcoded text tokens for text-foreground */}
        <label
          htmlFor="email"
          className="text-foreground block text-sm font-bold uppercase tracking-wide"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          required
          placeholder="member@auib.edu.iq"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-border bg-background text-foreground placeholder-foreground/30 focus:border-primary focus:ring-primary w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="password"
          className="text-foreground block text-sm font-bold uppercase tracking-wide"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-border bg-background text-foreground placeholder-foreground/30 focus:border-primary focus:ring-primary w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
        />
      </div>

      {status === 'error' && (
        <div className="bg-background flex items-center gap-3 border-4 border-red-500 p-4 text-sm font-bold text-red-500">
          <AlertTriangle size={20} />
          {errorMessage}
        </div>
      )}

      {/* Button state fully inverted to ensure stark contrast in dark and light themes */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-foreground text-background border-border hover:bg-primary hover:border-primary w-full border-4 p-4 font-bold uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
      >
        {status === 'loading' ? 'Authenticating...' : 'Authenticate'}
      </button>

      <div className="border-border mt-8 border-t-4 pt-8 text-center">
        <Link
          href="/register"
          className="text-foreground hover:text-primary inline-block text-sm font-bold uppercase tracking-wider transition-colors hover:-translate-y-0.5"
        >
          Create an Account
        </Link>
      </div>
    </form>
  );
}

export default function NexusLogin() {
  return (
    // Outer shell anchored to background, inner container anchored to card
    <div className="bg-background flex min-h-screen items-center justify-center p-6 font-sans">
      <div className="border-border bg-card w-full max-w-xl border-4 shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
        <div className="p-8 md:p-12">
          <h1 className="text-foreground border-border mb-4 border-b-4 pb-4 text-4xl font-black uppercase tracking-tighter">
            Nexus Gateway
          </h1>
          <p className="text-foreground/80 mb-10 text-sm font-bold uppercase leading-relaxed tracking-widest">
            Enter your credentials to access the internal society dashboard.
          </p>

          {/* 3. Wrap the search parameters in a Suspense boundary */}
          <Suspense
            fallback={
              <div className="text-foreground/50 flex h-48 items-center justify-center font-bold uppercase tracking-widest">
                Loading Gateway...
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
