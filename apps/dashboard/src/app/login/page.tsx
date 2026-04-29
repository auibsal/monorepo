
'use client';

import { useState } from 'react';
import { createClient } from '@repo/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Successfully logged in, redirect to the dashboard
      router.push('/');
      router.refresh(); 
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black uppercase tracking-widest text-zinc-50">The IDEA Suite</h1>
          <p className="text-xs tracking-widest text-amber-500 mt-2 uppercase">Authorized Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs uppercase tracking-wider p-3 text-center">
              {error}
            </div>
          )}

          <input
            type="email"
            placeholder="EMAIL ADDRESS"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-zinc-950 border border-zinc-800 p-3 text-xs uppercase tracking-wider text-zinc-50 focus:border-amber-500 outline-none transition-colors w-full"
          />
          
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-zinc-950 border border-zinc-800 p-3 text-xs tracking-wider text-zinc-50 focus:border-amber-500 outline-none transition-colors w-full"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 text-zinc-950 font-bold uppercase tracking-widest text-xs py-4 mt-4 hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Enter System'}
          </button>
        </form>
      </div>
    </div>
  );
}
