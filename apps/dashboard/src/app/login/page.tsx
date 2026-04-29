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
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); } 
    else { router.push('/'); router.refresh(); }
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm border border-zinc-300 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black uppercase tracking-widest text-zinc-900">The IDEA Suite</h1>
          <p className="text-xs tracking-widest text-amber-600 mt-2 uppercase">Authorized Access Only</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs uppercase tracking-wider p-3 text-center">{error}</div>}
          <input type="email" placeholder="EMAIL ADDRESS" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="bg-zinc-50 border border-zinc-300 p-3 text-xs uppercase tracking-wider focus:border-amber-500 outline-none w-full" />
          <input type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="bg-zinc-50 border border-zinc-300 p-3 text-xs tracking-wider focus:border-amber-500 outline-none w-full" />
          <button type="submit" disabled={loading} className="bg-amber-500 text-white font-bold uppercase tracking-widest text-xs py-4 mt-4 hover:bg-amber-400 transition-colors disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Enter System'}
          </button>
        </form>
      </div>
    </div>
  );
}
