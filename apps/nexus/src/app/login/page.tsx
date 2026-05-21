'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@auibsal/auth/client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

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
          className="block text-sm font-bold text-foreground uppercase tracking-wide"
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
          className="w-full p-4 border-4 border-border bg-background text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold"
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="password"
          className="block text-sm font-bold text-foreground uppercase tracking-wide"
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
          className="w-full p-4 border-4 border-border bg-background text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold"
        />
      </div>

      {status === 'error' && (
        <div className="p-4 border-4 border-red-500 bg-background text-red-500 text-sm font-bold flex items-center gap-3">
          <AlertTriangle size={20} />
          {errorMessage}
        </div>
      )}

      {/* Button state fully inverted to ensure stark contrast in dark and light themes */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-foreground text-background p-4 font-bold uppercase tracking-widest border-4 border-border hover:bg-primary hover:border-primary transition-all disabled:opacity-50 shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1"
      >
        {status === 'loading' ? 'Authenticating...' : 'Authenticate'}
      </button>

      <div className="text-center mt-8 pt-8 border-t-4 border-border">
        <Link href="/register" className="text-foreground hover:text-primary text-sm font-bold uppercase tracking-wider transition-colors inline-block hover:-translate-y-0.5">
          Create an Account
        </Link>
      </div>
    </form>
  );
}

export default function NexusLogin() {
  return (
    // Outer shell anchored to background, inner container anchored to card
    <div className="min-h-screen flex items-center justify-center bg-background p-6 font-sans">
      <div className="w-full max-w-xl border-4 border-border bg-card shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
        <div className="p-8 md:p-12">
          
          <h1 className="text-4xl font-black text-foreground mb-4 uppercase tracking-tighter border-b-4 border-border pb-4">
            Nexus Gateway
          </h1>
          <p className="text-sm text-foreground/80 mb-10 font-bold uppercase tracking-widest leading-relaxed">
            Enter your credentials to access the internal society dashboard.
          </p>

          {/* 3. Wrap the search parameters in a Suspense boundary */}
          <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold uppercase tracking-widest text-foreground/50">Loading Gateway...</div>}>
            <LoginForm />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
