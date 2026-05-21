'use client';

import { useState } from 'react';

import Link from 'next/link';

import { CheckSquare, ShieldAlert } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';

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

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPolicy) {
      setStatus('error');
      setErrorMessage('You must agree to the Human Authorship Policy.');
      return;
    }

    const wordCount = bio.trim() ? bio.trim().split(/\s+/).length : 0;
    if (wordCount > 50) {
      setStatus('error');
      setErrorMessage('Biography must be 50 words or less.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${webUrl}/api/auth/callback`,
        data: {
          full_name: fullName,
          university_id: isExternal ? 'EXTERNAL' : studentId,
          biography: bio,
        },
      },
    });

    if (error) {
      setStatus('error');
      const errLower = error.message.toLowerCase();
      if (errLower.includes('already registered') || errLower.includes('user already exists')) {
        setErrorMessage(
          'An account with this email already exists. Please proceed to the login page.'
        );
      } else {
        setErrorMessage(error.message);
      }
    } else if (data?.user?.identities && data.user.identities.length === 0) {
      setStatus('error');
      setErrorMessage(
        'An account with this email already exists. Please proceed to the login page.'
      );
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6 py-12 font-sans md:py-24">
      {/* Container fully mapped to semantic card, border, and brutalist shadow variables */}
      <div className="border-border bg-card w-full max-w-2xl border-4 shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
        <div className="p-8 md:p-12">
          {/* Brutalist Header */}
          <h1 className="text-foreground border-border mb-4 border-b-4 pb-4 text-4xl font-black uppercase tracking-tighter">
            Membership Application
          </h1>
          <p className="text-foreground/80 mb-10 text-sm font-bold uppercase leading-relaxed tracking-widest">
            Create an account to join the Society of Arts and Letters.
          </p>

          {status === 'success' ? (
            <div className="border-border bg-foreground text-background flex flex-col items-center justify-center gap-4 border-4 p-6 text-center text-sm font-bold uppercase tracking-widest">
              <CheckSquare size={48} className="text-green-500" />
              <p>Registration successful.</p>
              <p className="text-background/70 text-xs">
                Please check your email to verify your account before logging in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3 text-start">
                <label
                  htmlFor="fullName"
                  className="text-foreground block text-sm font-bold uppercase tracking-wide"
                >
                  Legal Full Name <span className="text-primary">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
                />
              </div>

              <div className="border-border/10 bg-foreground/5 space-y-6 border-4 p-6">
                <label
                  htmlFor="isExternal"
                  className="text-foreground flex cursor-pointer items-center space-x-3 text-sm font-bold uppercase tracking-wide"
                >
                  <input
                    id="isExternal"
                    type="checkbox"
                    checked={isExternal}
                    onChange={(e) => setIsExternal(e.target.checked)}
                    className="border-border text-primary focus:ring-primary bg-background h-6 w-6 rounded-none border-4 focus:ring-offset-0"
                  />
                  <span>I am an external affiliate (No AUIB ID)</span>
                </label>

                {!isExternal && (
                  <div className="border-border/10 space-y-3 border-t-2 pt-4 text-start">
                    <label
                      htmlFor="studentId"
                      className="text-foreground block text-sm font-bold uppercase tracking-wide"
                    >
                      AUIB Student ID & Major <span className="text-primary">*</span>
                    </label>
                    <input
                      id="studentId"
                      type="text"
                      required={!isExternal}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 123456 / Software Engineering"
                      className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3 text-start">
                  <label
                    htmlFor="email"
                    className="text-foreground block text-sm font-bold uppercase tracking-wide"
                  >
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="student@auib.edu.iq"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="space-y-3 text-start">
                  <label
                    htmlFor="password"
                    className="text-foreground block text-sm font-bold uppercase tracking-wide"
                  >
                    Password <span className="text-primary">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              <div className="space-y-3 text-start">
                <label
                  htmlFor="bio"
                  className="text-foreground block text-sm font-bold uppercase tracking-wide"
                >
                  3rd-Person Author Bio <span className="text-primary">(Max 50 words)</span>
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full resize-none rounded-none border-4 p-4 font-medium leading-relaxed transition-all focus:outline-none focus:ring-1"
                />
                <div
                  className={`text-right text-xs font-bold uppercase tracking-widest ${bio.trim().split(/\s+/).length > 50 ? 'text-primary' : 'text-foreground/50'}`}
                >
                  {bio.trim() ? bio.trim().split(/\s+/).length : 0} / 50 words
                </div>
              </div>

              <div className="border-primary bg-primary/5 border-4 p-6">
                <label
                  htmlFor="aiPolicy"
                  className="text-foreground flex cursor-pointer items-start space-x-4 text-sm font-bold tracking-wide"
                >
                  <input
                    id="aiPolicy"
                    type="checkbox"
                    required
                    checked={aiPolicy}
                    onChange={(e) => setAiPolicy(e.target.checked)}
                    className="border-primary text-primary focus:ring-primary bg-background mt-1 h-6 w-6 rounded-none border-4 focus:ring-offset-0"
                  />
                  <span className="leading-relaxed">
                    I guarantee that any submitted work will be entirely my own human creation. I
                    explicitly understand that the use of Generative AI is strictly prohibited.{' '}
                    <span className="text-primary">*</span>
                  </span>
                </label>
              </div>

              {status === 'error' && (
                <div className="bg-background flex items-center gap-3 border-4 border-red-500 p-4 text-sm font-bold text-red-500">
                  <ShieldAlert size={20} />
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-foreground text-background border-border hover:bg-primary hover:border-primary w-full border-4 p-4 font-bold uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
              >
                {status === 'loading' ? 'Processing Application...' : 'Submit Application'}
              </button>

              <div className="border-border mt-8 border-t-4 pt-8 text-center">
                <Link
                  href="/login"
                  className="text-foreground hover:text-primary inline-block text-sm font-bold uppercase tracking-wider transition-colors hover:-translate-y-0.5"
                >
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
