'use client';

import { useEffect, useState } from 'react';

import { AlertTriangle, BookOpen, CheckSquare, Mail, Save, User } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';

export default function ProfilePage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [bio, setBio] = useState('');

  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('Authentication required.');

        if (isMounted) setEmail(user.email || '');

        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('full_name, university_id, biography')
          .eq('id', user.id)
          .single();

        if (dbError) throw dbError;

        if (isMounted && userData) {
          setFullName(userData.full_name || '');
          if (userData.university_id === 'EXTERNAL') {
            setIsExternal(true);
            setStudentId('');
          } else {
            setIsExternal(false);
            setStudentId(userData.university_id || '');
          }
          setBio(userData.biography || '');
          setStatus('idle');
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load profile data.');
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const wordCount = bio.trim() ? bio.trim().split(/\s+/).length : 0;
    if (wordCount > 50) {
      setStatus('error');
      setErrorMessage('Biography must be 50 words or less.');
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired. Please log in again.');

      // Update public users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          university_id: isExternal ? 'EXTERNAL' : studentId,
          biography: bio,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Sync user_metadata in the Auth schema for global consistency
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          university_id: isExternal ? 'EXTERNAL' : studentId,
          biography: bio,
        },
      });

      if (authUpdateError) throw authUpdateError;

      setStatus('success');

      // Clear success message after 3 seconds to return to idle state
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'An unknown exception occurred during transmission.'
      );
    }
  };

  if (status === 'loading') {
    return (
      <div className="space-y-12">
        <div className="border-border flex items-center justify-between border-b-4 pb-4">
          <h2 className="text-foreground text-3xl font-bold uppercase tracking-widest">
            Profile Settings
          </h2>
        </div>
        <div className="bg-card border-border flex items-center justify-center border-4 p-12 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]">
          <div className="text-foreground/50 flex animate-pulse items-center gap-4 font-bold uppercase tracking-widest">
            <div className="bg-primary h-4 w-4 animate-spin rounded-none"></div>
            Decrypting Profile Data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="border-border flex items-center justify-between border-b-4 pb-4">
        <h2 className="text-foreground text-3xl font-bold uppercase tracking-widest">
          Profile Settings
        </h2>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-card border-border space-y-8 border-4 p-6 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:p-12"
      >
        {/* Core Identity Section */}
        <div className="space-y-6">
          <h3 className="text-foreground border-border/20 flex items-center gap-3 border-b-2 pb-2 text-xl font-black uppercase tracking-widest">
            <User className="text-primary" size={24} />
            Core Identity
          </h3>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3">
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
                placeholder="e.g. Shaheen Farjo"
                onChange={(e) => setFullName(e.target.value)}
                className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
              />
            </div>

            <div className="space-y-3">
              <label
                htmlFor="email"
                className="text-foreground block text-sm font-bold uppercase tracking-wide"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  disabled
                  value={email}
                  className="border-border bg-background/50 text-foreground/50 w-full cursor-not-allowed rounded-none border-4 p-4 font-bold"
                />
                <Mail
                  className="text-foreground/30 absolute right-4 top-1/2 -translate-y-1/2"
                  size={20}
                />
              </div>
              <p className="text-primary text-xs font-bold uppercase tracking-widest">
                Identity locked. Contact sysadmin to modify.
              </p>
            </div>
          </div>
        </div>

        {/* Academic Affiliation Section */}
        <div className="border-border/10 space-y-6 border-t-4 pt-4">
          <h3 className="text-foreground border-border/20 flex items-center gap-3 border-b-2 pb-2 text-xl font-black uppercase tracking-widest">
            <BookOpen className="text-primary" size={24} />
            Academic Affiliation
          </h3>

          <div className="border-border/10 bg-foreground/5 space-y-6 border-4 p-6">
            <label
              htmlFor="isExternal"
              className="text-foreground flex cursor-pointer items-center space-x-3 text-sm font-bold uppercase tracking-wide"
            >
              <input
                id="isExternal"
                type="checkbox"
                checked={isExternal}
                onChange={(e) => {
                  setIsExternal(e.target.checked);
                  if (e.target.checked) setStudentId('');
                }}
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
                  placeholder="e.g. 123456 / Entrepreneurship"
                  className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full rounded-none border-4 p-4 font-bold transition-all focus:outline-none focus:ring-1"
                />
              </div>
            )}
          </div>
        </div>

        {/* Biography Section */}
        <div className="border-border/10 space-y-3 border-t-4 pt-4">
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
            placeholder="e.g. Founder of The IDEA IQ Inc. majoring in Entrepreneurship with a minor in Literature..."
            onChange={(e) => setBio(e.target.value)}
            className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full resize-none rounded-none border-4 p-4 font-medium leading-relaxed transition-all focus:outline-none focus:ring-1"
          />
          <div
            className={`text-right text-xs font-bold uppercase tracking-widest ${bio.trim().split(/\s+/).length > 50 ? 'text-primary' : 'text-foreground/50'}`}
          >
            {bio.trim() ? bio.trim().split(/\s+/).length : 0} / 50 words
          </div>
        </div>

        {/* System Feedback Matrix */}
        {status === 'error' && (
          <div className="bg-background flex items-center gap-3 border-4 border-red-500 p-4 text-sm font-bold text-red-500">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <span className="break-words">{errorMessage}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-background flex items-center gap-3 border-4 border-green-500 p-4 text-sm font-bold text-green-500">
            <CheckSquare size={20} className="flex-shrink-0" />
            <span>Profile parameters successfully synchronized.</span>
          </div>
        )}

        {/* Command Execution */}
        <div className="border-border mt-8 border-t-4 pt-8">
          <button
            type="submit"
            disabled={status === 'saving' || status === 'loading'}
            className="bg-foreground text-background border-border hover:bg-primary hover:border-primary flex w-full items-center justify-center gap-3 border-4 px-6 py-4 text-sm font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50 md:text-base md:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] md:hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]"
          >
            {status === 'saving' ? (
              <>
                <div className="bg-background h-4 w-4 animate-spin rounded-none"></div>
                Transmitting Data...
              </>
            ) : (
              <>
                <Save size={20} />
                Execute Profile Update
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
