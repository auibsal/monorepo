'use client';

import { createClient } from '@auibsal/auth/client';
import { CheckSquare, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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

    // CRITICAL FIX: Dynamically calculate the origin of the Nexus portal
    // This guarantees the verification email points back to the Nexus callback route, not the Web app.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Pointing directly to the Nexus callback
        emailRedirectTo: `${origin}/api/auth/callback`,
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
          'An account with this email already exists. Please proceed to the login page.',
        );
      } else {
        setErrorMessage(error.message);
      }
    } else if (data?.user?.identities && data.user.identities.length === 0) {
      setStatus('error');
      setErrorMessage(
        'An account with this email already exists. Please proceed to the login page.',
      );
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 py-12 font-sans md:py-24">
      {/* Container fully mapped to semantic card, border, and brutalist shadow variables */}
      <div className="w-full max-w-2xl border-4 border-border bg-card shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
        <div className="p-8 md:p-12">
          {/* Brutalist Header */}
          <h1 className="mb-4 border-b-4 border-border pb-4 text-4xl font-black tracking-tighter text-foreground uppercase">
            Membership Application
          </h1>
          <p className="mb-10 text-sm leading-relaxed font-bold tracking-widest text-foreground/80 uppercase">
            Create an account to join the Society of Arts and Letters.
          </p>

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center gap-4 border-4 border-border bg-foreground p-6 text-center text-sm font-bold tracking-widest text-background uppercase">
              <CheckSquare size={48} className="text-green-500" />
              <p>Registration successful.</p>
              <p className="text-xs text-background/70">
                Please check your email to verify your account before logging in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3 text-start">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-bold tracking-wide text-foreground uppercase"
                >
                  Legal Full Name <span className="text-primary">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-6 border-4 border-border/10 bg-foreground/5 p-6">
                <label
                  htmlFor="isExternal"
                  className="flex cursor-pointer items-center space-x-3 text-sm font-bold tracking-wide text-foreground uppercase"
                >
                  <input
                    id="isExternal"
                    type="checkbox"
                    checked={isExternal}
                    onChange={(e) => setIsExternal(e.target.checked)}
                    className="h-6 w-6 rounded-none border-4 border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span>I am an external affiliate (No AUIB ID)</span>
                </label>

                {!isExternal && (
                  <div className="space-y-3 border-t-2 border-border/10 pt-4 text-start">
                    <label
                      htmlFor="studentId"
                      className="block text-sm font-bold tracking-wide text-foreground uppercase"
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
                      className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3 text-start">
                  <label
                    htmlFor="email"
                    className="block text-sm font-bold tracking-wide text-foreground uppercase"
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
                    className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-3 text-start">
                  <label
                    htmlFor="password"
                    className="block text-sm font-bold tracking-wide text-foreground uppercase"
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
                    className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 text-start">
                <label
                  htmlFor="bio"
                  className="block text-sm font-bold tracking-wide text-foreground uppercase"
                >
                  3rd-Person Author Bio <span className="text-primary">(Max 50 words)</span>
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full resize-none rounded-none border-4 border-border bg-background p-4 leading-relaxed font-medium text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <div
                  className={`text-right text-xs font-bold tracking-widest uppercase ${bio.trim().split(/\s+/).length > 50 ? 'text-primary' : 'text-foreground/50'}`}
                >
                  {bio.trim() ? bio.trim().split(/\s+/).length : 0} / 50 words
                </div>
              </div>

              <div className="border-4 border-primary bg-primary/5 p-6">
                <label
                  htmlFor="aiPolicy"
                  className="flex cursor-pointer items-start space-x-4 text-sm font-bold tracking-wide text-foreground"
                >
                  <input
                    id="aiPolicy"
                    type="checkbox"
                    required
                    checked={aiPolicy}
                    onChange={(e) => setAiPolicy(e.target.checked)}
                    className="mt-1 h-6 w-6 rounded-none border-4 border-primary bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="leading-relaxed">
                    I guarantee that any submitted work will be entirely my own human creation. I
                    explicitly understand that the use of Generative AI is strictly prohibited.{' '}
                    <span className="text-primary">*</span>
                  </span>
                </label>
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
                  <ShieldAlert size={20} />
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex w-full items-center justify-center gap-3 border-4 border-border bg-foreground p-4 font-bold tracking-widest text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              >
                {status === 'loading' && <div className="h-4 w-4 animate-spin rounded-none bg-background"></div>}
                {status === 'loading' ? 'Processing Application...' : 'Submit Application'}
              </button>

              <div className="mt-8 border-t-4 border-border pt-8 text-center">
                <Link
                  href="/login"
                  className="inline-block text-sm font-bold tracking-wider text-foreground uppercase transition-colors hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
