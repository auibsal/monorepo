'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useTranslations } from 'next-intl';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const t = useTranslations('LoginPage');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('success');
      window.location.href = '/dashboard'; // Let proxy handle correct routing
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 text-start">
        <label
          htmlFor="login-email"
          className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal"
        >
          {t('emailLabel')}
        </label>
        <input
          id="login-email"
          type="email"
          required
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent border-auib-charcoal text-auib-charcoal placeholder-auib-charcoal/40 focus:border-auib-red"
        />
      </div>

      <div className="space-y-2 text-start">
        <label
          htmlFor="login-password"
          className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal"
        >
          {t('passwordLabel')}
        </label>
        <input
          id="login-password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent border-auib-charcoal text-auib-charcoal placeholder-auib-charcoal/40 focus:border-auib-red"
        />
      </div>

      {status === 'error' && (
        <div className="p-3 border-2 border-auib-red text-auib-red text-sm font-bold text-start">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full p-4 font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-none bg-auib-charcoal text-auib-white hover:bg-auib-red border-2 border-auib-charcoal hover:border-auib-red"
      >
        {status === 'loading' ? t('loading') : t('loginButton')}
      </button>

      <div className="text-center mt-4">
        <a href="register" className="text-auib-red hover:underline text-sm font-bold uppercase">{t('registerTitle')}</a>
      </div>
    </form>
  );
}
