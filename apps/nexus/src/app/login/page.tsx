'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function NexusLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize the Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
      // Full page reload or redirect
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-auib-white p-4 font-sans">
      <div className="w-full max-w-xl border-2 border-auib-charcoal bg-white shadow-[8px_8px_0px_0px_#273237]">
        <div className="p-8 md:p-12">
          {/* Brutalist Header */}
          <h1 className="text-3xl font-bold text-auib-charcoal mb-2 uppercase tracking-tight">
            Member Login
          </h1>
          <p className="text-sm text-auib-charcoal/70 mb-8 font-medium">
            Access the Nexus portal.
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
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
                className="w-full p-3 border-2 border-auib-charcoal bg-transparent text-auib-charcoal placeholder-auib-charcoal/40 focus:outline-none focus:ring-0 focus:border-auib-red transition-colors rounded-none"
              />
            </div>

            <div className="space-y-2">
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
                className="w-full p-3 border-2 border-auib-charcoal bg-transparent text-auib-charcoal placeholder-auib-charcoal/40 focus:outline-none focus:ring-0 focus:border-auib-red transition-colors rounded-none"
              />
            </div>

            {status === 'error' && (
              <div className="p-3 border-2 border-auib-red text-auib-red text-sm font-bold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-auib-charcoal text-white p-4 font-bold uppercase tracking-widest hover:bg-auib-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
            >
              {status === 'loading' ? 'Authenticating...' : 'Authenticate'}
            </button>

            <div className="text-center mt-4">
              <Link href="/register" className="text-auib-red hover:underline text-sm font-bold uppercase">
                Create an Account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
