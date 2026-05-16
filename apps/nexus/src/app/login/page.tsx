'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { createClient } from 'auth/client';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Intercept URL errors from the API callbacks
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorMessages: Record<string, string> = {
      invalid_auth_code: 'Your login link expired or was invalid. Please authenticate again.',
      access_denied: 'Access was denied. Please try again or contact support.',
      session_expired: 'Your session has expired. Please sign in again.',
    };

    if (errorParam) {
      setStatus('error');
      setErrorMessage(errorMessages[errorParam] || 'Authentication failed. Please try again.');
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
      router.push(next);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-8">
      <div className="space-y-3">
        <label
          htmlFor="email"
          className="block text-sm font-bold text-auib-charcoal uppercase tracking-wide"
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
          className="w-full p-4 border-4 border-auib-charcoal bg-white text-auib-charcoal placeholder-auib-charcoal/30 focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold"
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="password"
          className="block text-sm font-bold text-auib-charcoal uppercase tracking-wide"
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
          className="w-full p-4 border-4 border-auib-charcoal bg-white text-auib-charcoal placeholder-auib-charcoal/30 focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold"
        />
      </div>

      {status === 'error' && (
        <div className="p-4 border-4 border-auib-red bg-white text-auib-red text-sm font-bold flex items-center gap-3">
          <AlertTriangle size={20} />
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-auib-charcoal text-white p-4 font-bold uppercase tracking-widest border-4 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-all disabled:opacity-50 shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-1"
      >
        {status === 'loading' ? 'Authenticating...' : 'Authenticate'}
      </button>

      <div className="text-center mt-8 pt-8 border-t-4 border-auib-charcoal">
        <Link href="/register" className="text-auib-charcoal hover:text-auib-red text-sm font-bold uppercase tracking-wider transition-colors inline-block hover:-translate-y-0.5">
          Create an Account
        </Link>
      </div>
    </form>
  );
}

export default function NexusLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-auib-white p-6 font-sans">
      <div className="w-full max-w-xl border-4 border-auib-charcoal bg-white shadow-[16px_16px_0px_0px_#273237]">
        <div className="p-8 md:p-12">
          
          <h1 className="text-4xl font-black text-auib-charcoal mb-4 uppercase tracking-tighter border-b-4 border-auib-charcoal pb-4">
            Nexus Gateway
          </h1>
          <p className="text-sm text-auib-charcoal/80 mb-10 font-bold uppercase tracking-widest leading-relaxed">
            Enter your credentials to access the internal society dashboard.
          </p>

          {/* 3. Wrap the search parameters in a Suspense boundary */}
          <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold uppercase tracking-widest text-auib-charcoal/50">Loading Gateway...</div>}>
            <LoginForm />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
