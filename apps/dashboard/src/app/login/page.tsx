'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function DashboardLogin() {
  const [email, setEmail] = useState('');
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

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect to the dashboard's specific auth callback route
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-auib-white p-4 font-sans">
      <div className="w-full max-w-md p-8 border-2 border-auib-charcoal bg-white shadow-[8px_8px_0px_0px_#273237]">
        
        {/* Brutalist Header */}
        <h1 className="text-3xl font-bold text-auib-charcoal mb-2 uppercase tracking-tight">
          System Access
        </h1>
        <p className="text-sm text-auib-charcoal/70 mb-8 font-medium">
          Internal Dashboard — Authorized Personnel Only.
        </p>

        {status === 'success' ? (
          <div className="p-4 bg-auib-charcoal text-white border border-auib-charcoal font-mono text-sm">
            Access token dispatched. Check your university inbox.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block text-sm font-bold text-auib-charcoal uppercase tracking-wide"
              >
                University Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="editor@auib.edu.iq"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {status === 'loading' ? 'Authenticating...' : 'Send Access Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
