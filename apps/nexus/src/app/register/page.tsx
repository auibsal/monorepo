'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function NexusRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [bio, setBio] = useState('');
  const [aiPolicy, setAiPolicy] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPolicy) {
      setStatus('error');
      setErrorMessage('You must agree to the AI Policy.');
      return;
    }

    // Check bio word count
    const wordCount = bio.trim().split(/\s+/).length;
    if (bio.trim().length > 0 && wordCount > 50) {
      setStatus('error');
      setErrorMessage('Biography must be 50 words or less.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        data: {
          full_name: fullName,
          university_id: isExternal ? 'EXTERNAL' : studentId,
          biography: bio,
        }
      }
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-auib-white p-4 font-sans py-12 md:py-24">
      <div className="w-full max-w-xl border-2 border-auib-charcoal bg-auib-charcoal text-auib-white shadow-[8px_8px_0px_0px_#9C213E]">
        <div className="p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-auib-white mb-2 uppercase tracking-tight">
            Create an Account
          </h2>
          <p className="text-sm text-auib-white/70 mb-8 font-medium">
            Join the society.
          </p>

          {status === 'success' ? (
            <div className="p-4 border-2 border-auib-white bg-transparent font-mono text-sm text-auib-white">
              Registration successful! Please check your email to verify your account.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-start">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-white">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent border-auib-white text-auib-white placeholder-auib-white/40 focus:border-auib-red"
                />
              </div>

              <div className="space-y-2 text-start">
                <label className="flex items-center space-x-2 text-sm font-bold uppercase tracking-wide text-auib-white cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isExternal}
                    onChange={(e) => setIsExternal(e.target.checked)}
                    className="w-4 h-4 rounded-none border-2 border-auib-white text-auib-red focus:ring-auib-red bg-transparent"
                  />
                  <span>I am an external member/alumni (No AUIB ID)</span>
                </label>

                {!isExternal && (
                  <>
                    <label className="block text-sm font-bold uppercase tracking-wide text-auib-white">
                      AUIB Student ID / Major
                    </label>
                    <input
                      type="text"
                      required={!isExternal}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 123456 / Software Engineering"
                      className="w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent border-auib-white text-auib-white placeholder-auib-white/40 focus:border-auib-red"
                    />
                  </>
                )}
              </div>

              <div className="space-y-2 text-start">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-white">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent border-auib-white text-auib-white placeholder-auib-white/40 focus:border-auib-red"
                />
              </div>

              <div className="space-y-2 text-start">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-white">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent border-auib-white text-auib-white placeholder-auib-white/40 focus:border-auib-red"
                />
              </div>

              <div className="space-y-2 text-start">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-white">
                  3rd-Person Author Bio (Max 50 words)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3 border-2 focus:outline-none focus:ring-0 transition-colors rounded-none bg-transparent border-auib-white text-auib-white placeholder-auib-white/40 focus:border-auib-red"
                />
                <div className="text-xs text-auib-white/70 text-right">
                  {bio.trim() ? bio.trim().split(/\s+/).length : 0} / 50 words
                </div>
              </div>

              <div className="space-y-2 text-start">
                <label className="flex items-start space-x-3 text-sm font-bold tracking-wide text-auib-white cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={aiPolicy}
                    onChange={(e) => setAiPolicy(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded-none border-2 border-auib-white text-auib-red focus:ring-auib-red bg-transparent"
                  />
                  <span className="leading-snug">
                    I guarantee that this work is entirely my own human creation. I understand that Generative AI is strictly prohibited.
                  </span>
                </label>
              </div>

              {status === 'error' && (
                <div className="p-3 border-2 border-auib-red text-auib-red bg-auib-white text-sm font-bold text-start">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full p-4 font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-none bg-auib-white text-auib-charcoal hover:bg-auib-red hover:text-auib-white border-2 border-auib-white hover:border-auib-red"
              >
                {status === 'loading' ? 'Processing...' : 'Register'}
              </button>

              <div className="text-center mt-4">
                <Link href="/login" className="text-auib-white/70 hover:text-auib-white hover:underline text-sm font-bold uppercase">
                  Back to Member Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
