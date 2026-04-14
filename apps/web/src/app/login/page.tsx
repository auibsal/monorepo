'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPlayer() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // In the next step, this will connect to Supabase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // NOTE: This is where you will add your Supabase Auth login logic
    // const { error } = await supabase.auth.signInWithPassword({ ... })

    // Simulate database latency
    setTimeout(() => {
      setIsLoading(false);
      // alert('Supabase integration pending!');
    }, 1500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">

        {/* Portal Header */}
        <div className="text-center mb-10">
          <h2 className="text-sm font-medium tracking-widest uppercase opacity-60 mb-2 text-red-500">
            Secure IDA Portal
          </h2>
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight mb-4">
            Access Dashboard
          </h1>
          <p className="font-light opacity-80 text-sm max-w-md mx-auto">
            Provide your authorized credentials to access your player profile and view your latest ELO standings.
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-federation-ivory/5 border border-federation-ivory/20 p-8 rounded-sm shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                placeholder="player@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                Secure Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 mt-4 font-bold uppercase tracking-widest rounded-sm transition-all duration-200 flex justify-center items-center gap-3 ${isLoading ? 'bg-federation-ivory/50 text-federation-obsidian cursor-not-allowed' : 'bg-federation-ivory text-federation-obsidian hover:bg-white'}`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-federation-obsidian/30 border-t-federation-obsidian rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm font-light opacity-60">
            Don&apos;t have a Federation ID? <Link href="/register" className="text-federation-ivory font-bold hover:underline">Claim Player ID</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
