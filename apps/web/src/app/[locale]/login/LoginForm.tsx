'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';

export default function LoginForm({ mode }: { mode: 'login' | 'register' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const t = useTranslations('LoginPage');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        setStatus('success');
        router.push('/portal');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        }
      });
      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        setStatus('success');
      }
    }
  };

  if (status === 'success' && mode === 'register') {
    return (
      <div className="p-4 border-2 border-auib-white bg-transparent font-mono text-sm">
        {t('registerSuccess')}
      </div>
    );
  }

  const isRegister = mode === 'register';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 text-start">
        <label
          htmlFor={`${mode}-email`}
          className={`block text-sm font-bold uppercase tracking-wide ${isRegister ? 'text-auib-white' : 'text-auib-charcoal'}`}
        >
          {t('emailLabel')}
        </label>
        <input
          id={`${mode}-email`}
          type="email"
          required
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent ${
            isRegister
              ? 'border-auib-white text-auib-white placeholder-auib-white/40 focus:border-auib-red'
              : 'border-auib-charcoal text-auib-charcoal placeholder-auib-charcoal/40 focus:border-auib-red'
          }`}
        />
      </div>

      <div className="space-y-2 text-start">
        <label
          htmlFor={`${mode}-password`}
          className={`block text-sm font-bold uppercase tracking-wide ${isRegister ? 'text-auib-white' : 'text-auib-charcoal'}`}
        >
          {t('passwordLabel')}
        </label>
        <input
          id={`${mode}-password`}
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent ${
            isRegister
              ? 'border-auib-white text-auib-white placeholder-auib-white/40 focus:border-auib-red'
              : 'border-auib-charcoal text-auib-charcoal placeholder-auib-charcoal/40 focus:border-auib-red'
          }`}
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
        className={`w-full p-4 font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-none ${
          isRegister
            ? 'bg-auib-white text-auib-charcoal hover:bg-auib-red hover:text-auib-white border-2 border-auib-white hover:border-auib-red'
            : 'bg-auib-charcoal text-auib-white hover:bg-auib-red border-2 border-auib-charcoal hover:border-auib-red'
        }`}
      >
        {status === 'loading'
          ? t('loading')
          : isRegister ? t('registerButton') : t('loginButton')}
      </button>
    </form>
  );
}
