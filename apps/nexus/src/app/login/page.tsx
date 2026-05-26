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
      if (
        !next.startsWith('/') ||
        next.startsWith('//') ||
        next.includes('\\') ||
        /[\s]/.test(next)
      ) {
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
          className="block text-sm font-bold tracking-wide text-foreground uppercase"
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
          className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground placeholder-foreground/30 transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="password"
          className="block text-sm font-bold tracking-wide text-foreground uppercase"
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
          className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground placeholder-foreground/30 transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
          <AlertTriangle size={20} />
          {errorMessage}
        </div>
      )}

      {/* Button state fully inverted to ensure stark contrast in dark and light themes */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full border-4 border-border bg-foreground p-4 font-bold tracking-widest text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
      >
        {status === 'loading' ? 'Authenticating...' : 'Authenticate'}
      </button>

      <div className="mt-8 border-t-4 border-border pt-8 text-center">
        <Link
          href="/register"
          className="inline-block text-sm font-bold tracking-wider text-foreground uppercase transition-colors hover:-translate-y-0.5 hover:text-primary"
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
    <div className="flex min-h-screen items-center justify-center bg-background p-6 font-sans">
      <div className="w-full max-w-xl border-4 border-border bg-card shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
        <div className="p-8 md:p-12">
          <h1 className="mb-4 border-b-4 border-border pb-4 text-4xl font-black tracking-tighter text-foreground uppercase">
            Nexus Gateway
          </h1>
          <p className="mb-10 text-sm leading-relaxed font-bold tracking-widest text-foreground/80 uppercase">
            Enter your credentials to access the internal society dashboard.
          </p>

          {/* 3. Wrap the search parameters in a Suspense boundary */}
          <Suspense
            fallback={
              <div className="flex h-48 items-center justify-center font-bold tracking-widest text-foreground/50 uppercase">
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
