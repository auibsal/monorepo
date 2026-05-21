'use client';

import { useState } from 'react';
import { createClient } from '@auibsal/auth/client';
import Link from 'next/link';
import { CheckSquare, ShieldAlert } from 'lucide-react';

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
        }
      }
    });

    if (error) {
      setStatus('error');
      const errLower = error.message.toLowerCase();
      if (errLower.includes('already registered') || errLower.includes('user already exists')) {
        setErrorMessage("An account with this email already exists. Please proceed to the login page.");
      } else {
        setErrorMessage(error.message);
      }
    } else if (data?.user?.identities && data.user.identities.length === 0) {
      setStatus('error');
      setErrorMessage("An account with this email already exists. Please proceed to the login page.");
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 font-sans py-12 md:py-24">
      {/* Container fully mapped to semantic card, border, and brutalist shadow variables */}
      <div className="w-full max-w-2xl border-4 border-border bg-card shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
        <div className="p-8 md:p-12">
          
          {/* Brutalist Header */}
          <h1 className="text-4xl font-black text-foreground mb-4 uppercase tracking-tighter border-b-4 border-border pb-4">
            Membership Application
          </h1>
          <p className="text-sm text-foreground/80 mb-10 font-bold uppercase tracking-widest leading-relaxed">
            Create an account to join the Society of Arts and Letters.
          </p>

          {status === 'success' ? (
            <div className="p-6 border-4 border-border bg-foreground text-background font-bold uppercase tracking-widest text-sm flex flex-col items-center justify-center text-center gap-4">
              <CheckSquare size={48} className="text-green-500" />
              <p>Registration successful.</p>
              <p className="text-xs text-background/70">Please check your email to verify your account before logging in.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-3 text-start">
                <label htmlFor="fullName" className="block text-sm font-bold uppercase tracking-wide text-foreground">
                  Legal Full Name <span className="text-primary">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground"
                />
              </div>

              <div className="p-6 border-4 border-border/10 bg-foreground/5 space-y-6">
                <label htmlFor="isExternal" className="flex items-center space-x-3 text-sm font-bold uppercase tracking-wide text-foreground cursor-pointer">
                  <input
                    id="isExternal"
                    type="checkbox"
                    checked={isExternal}
                    onChange={(e) => setIsExternal(e.target.checked)}
                    className="w-6 h-6 rounded-none border-4 border-border text-primary focus:ring-primary focus:ring-offset-0 bg-background"
                  />
                  <span>I am an external affiliate (No AUIB ID)</span>
                </label>

                {!isExternal && (
                  <div className="space-y-3 text-start pt-4 border-t-2 border-border/10">
                    <label htmlFor="studentId" className="block text-sm font-bold uppercase tracking-wide text-foreground">
                      AUIB Student ID & Major <span className="text-primary">*</span>
                    </label>
                    <input
                      id="studentId"
                      type="text"
                      required={!isExternal}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 123456 / Software Engineering"
                      className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 text-start">
                  <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wide text-foreground">
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="student@auib.edu.iq"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground"
                  />
                </div>

                <div className="space-y-3 text-start">
                  <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wide text-foreground">
                    Password <span className="text-primary">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-3 text-start">
                <label htmlFor="bio" className="block text-sm font-bold uppercase tracking-wide text-foreground">
                  3rd-Person Author Bio <span className="text-primary">(Max 50 words)</span>
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-medium resize-none leading-relaxed text-foreground"
                />
                <div className={`text-xs font-bold text-right uppercase tracking-widest ${bio.trim().split(/\s+/).length > 50 ? 'text-primary' : 'text-foreground/50'}`}>
                  {bio.trim() ? bio.trim().split(/\s+/).length : 0} / 50 words
                </div>
              </div>

              <div className="p-6 border-4 border-primary bg-primary/5">
                <label htmlFor="aiPolicy" className="flex items-start space-x-4 text-sm font-bold tracking-wide text-foreground cursor-pointer">
                  <input
                    id="aiPolicy"
                    type="checkbox"
                    required
                    checked={aiPolicy}
                    onChange={(e) => setAiPolicy(e.target.checked)}
                    className="w-6 h-6 mt-1 rounded-none border-4 border-primary text-primary focus:ring-primary focus:ring-offset-0 bg-background"
                  />
                  <span className="leading-relaxed">
                    I guarantee that any submitted work will be entirely my own human creation. I explicitly understand that the use of Generative AI is strictly prohibited. <span className="text-primary">*</span>
                  </span>
                </label>
              </div>

              {status === 'error' && (
                <div className="p-4 border-4 border-red-500 bg-background text-red-500 text-sm font-bold flex items-center gap-3">
                  <ShieldAlert size={20} />
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-foreground text-background p-4 font-bold uppercase tracking-widest border-4 border-border hover:bg-primary hover:border-primary transition-all disabled:opacity-50 shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1"
              >
                {status === 'loading' ? 'Processing Application...' : 'Submit Application'}
              </button>

              <div className="text-center mt-8 pt-8 border-t-4 border-border">
                <Link href="/login" className="text-foreground hover:text-primary text-sm font-bold uppercase tracking-wider transition-colors inline-block hover:-translate-y-0.5">
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
