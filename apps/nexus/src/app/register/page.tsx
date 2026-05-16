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

    // CRITICAL: Point the email confirmation back to the main public website
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
    <div className="min-h-screen flex items-center justify-center bg-auib-white p-6 font-sans py-12 md:py-24">
      <div className="w-full max-w-2xl border-4 border-auib-charcoal bg-white shadow-[16px_16px_0px_0px_#273237]">
        <div className="p-8 md:p-12">
          
          {/* Brutalist Header */}
          <h1 className="text-4xl font-black text-auib-charcoal mb-4 uppercase tracking-tighter border-b-4 border-auib-charcoal pb-4">
            Membership Application
          </h1>
          <p className="text-sm text-auib-charcoal/80 mb-10 font-bold uppercase tracking-widest leading-relaxed">
            Create an account to join the Society of Arts and Letters.
          </p>

          {status === 'success' ? (
            <div className="p-6 border-4 border-auib-charcoal bg-auib-charcoal text-white font-bold uppercase tracking-widest text-sm flex flex-col items-center justify-center text-center gap-4">
              <CheckSquare size={48} className="text-green-400" />
              <p>Registration successful.</p>
              <p className="text-xs text-white/70">Please check your email to verify your account before logging in.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-3 text-start">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">
                  Legal Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold"
                />
              </div>

              <div className="p-6 border-4 border-auib-charcoal/10 bg-auib-charcoal/5 space-y-6">
                <label className="flex items-center space-x-3 text-sm font-bold uppercase tracking-wide text-auib-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isExternal}
                    onChange={(e) => setIsExternal(e.target.checked)}
                    className="w-6 h-6 rounded-none border-4 border-auib-charcoal text-auib-red focus:ring-auib-red focus:ring-offset-0 bg-white"
                  />
                  <span>I am an external affiliate (No AUIB ID)</span>
                </label>

                {!isExternal && (
                  <div className="space-y-3 text-start pt-4 border-t-2 border-auib-charcoal/10">
                    <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">
                      AUIB Student ID & Major
                    </label>
                    <input
                      type="text"
                      required={!isExternal}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 123456 / Software Engineering"
                      className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 text-start">
                  <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@auib.edu.iq"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold"
                  />
                </div>

                <div className="space-y-3 text-start">
                  <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3 text-start">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">
                  3rd-Person Author Bio <span className="text-auib-red">(Max 50 words)</span>
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-medium resize-none leading-relaxed"
                />
                <div className={`text-xs font-bold text-right uppercase tracking-widest ${bio.trim().split(/\s+/).length > 50 ? 'text-auib-red' : 'text-auib-charcoal/50'}`}>
                  {bio.trim() ? bio.trim().split(/\s+/).length : 0} / 50 words
                </div>
              </div>

              <div className="p-6 border-4 border-auib-red bg-auib-red/5">
                <label className="flex items-start space-x-4 text-sm font-bold tracking-wide text-auib-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={aiPolicy}
                    onChange={(e) => setAiPolicy(e.target.checked)}
                    className="w-6 h-6 mt-1 rounded-none border-4 border-auib-red text-auib-red focus:ring-auib-red focus:ring-offset-0 bg-white"
                  />
                  <span className="leading-relaxed">
                    I guarantee that any submitted work will be entirely my own human creation. I explicitly understand that the use of Generative AI is strictly prohibited.
                  </span>
                </label>
              </div>

              {status === 'error' && (
                <div className="p-4 border-4 border-auib-red bg-white text-auib-red text-sm font-bold flex items-center gap-3">
                  <ShieldAlert size={20} />
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-auib-charcoal text-white p-4 font-bold uppercase tracking-widest border-4 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-all disabled:opacity-50 shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-1"
              >
                {status === 'loading' ? 'Processing Application...' : 'Submit Application'}
              </button>

              <div className="text-center mt-8 pt-8 border-t-4 border-auib-charcoal">
                <Link href="/login" className="text-auib-charcoal hover:text-auib-red text-sm font-bold uppercase tracking-wider transition-colors inline-block hover:-translate-y-0.5">
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
