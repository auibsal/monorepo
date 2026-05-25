'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { CheckSquare, ShieldAlert } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';

export default function SetupProfilePage() {
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [bio, setBio] = useState('');

  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();
  const router = useRouter();

  // Verify the user is actually authenticated via the invite link
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && isMounted) {
        router.push('/login?error=Please log in to complete setup.');
      } else if (isMounted) {
        setStatus('idle');
      }
    }
    checkSession();
    return () => { isMounted = false; };
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setStatus('error');
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const wordCount = bio.trim() ? bio.trim().split(/\s+/).length : 0;
    if (wordCount > 50) {
      setStatus('error');
      setErrorMessage('Biography must be 50 words or less.');
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Session expired. Please use your invite link again.');

      // 1. Establish the permanent password and sync Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
        data: {
          full_name: fullName,
          university_id: isExternal ? 'EXTERNAL' : studentId,
          biography: bio,
        }
      });
      if (authError) throw authError;

      // 2. Synchronize the public database profile
      // We use upsert here in case a database trigger failed to create the blank row during the invite
      const { error: dbError } = await supabase.from('users').upsert({
        id: user.id,
        full_name: fullName,
        university_id: isExternal ? 'EXTERNAL' : studentId,
        biography: bio,
        role: 'member', // Default fallback
      });
      if (dbError) throw dbError;

      // 3. Invalidate caches and route to the dashboard
      router.refresh();
      router.push('/');

    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'System failed to construct profile.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex animate-pulse items-center gap-4 font-bold tracking-widest text-foreground uppercase">
          <div className="h-4 w-4 animate-spin rounded-none bg-primary"></div>
          Validating Secure Invitation...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 py-12 font-sans md:py-24">
      <div className="w-full max-w-2xl border-4 border-border bg-card shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
        <div className="p-8 md:p-12">
          <h1 className="mb-4 border-b-4 border-border pb-4 text-4xl font-black tracking-tighter text-foreground uppercase">
            Initialize Profile
          </h1>
          <p className="mb-10 text-sm leading-relaxed font-bold tracking-widest text-foreground/80 uppercase">
            Your invitation was accepted. You must establish a permanent password and construct your identity matrix to access the Nexus.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3 text-start">
              <label htmlFor="password" className="block text-sm font-bold tracking-wide text-foreground uppercase">
                Establish Permanent Password <span className="text-primary">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-3 text-start">
              <label htmlFor="fullName" className="block text-sm font-bold tracking-wide text-foreground uppercase">
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
              <label htmlFor="isExternal" className="flex cursor-pointer items-center space-x-3 text-sm font-bold tracking-wide text-foreground uppercase">
                <input
                  id="isExternal"
                  type="checkbox"
                  checked={isExternal}
                  onChange={(e) => {
                    setIsExternal(e.target.checked);
                    if (e.target.checked) setStudentId('');
                  }}
                  className="h-6 w-6 rounded-none border-4 border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span>I am an external affiliate (No AUIB ID)</span>
              </label>

              {!isExternal && (
                <div className="space-y-3 border-t-2 border-border/10 pt-4 text-start">
                  <label htmlFor="studentId" className="block text-sm font-bold tracking-wide text-foreground uppercase">
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

            <div className="space-y-3 text-start">
              <label htmlFor="bio" className="block text-sm font-bold tracking-wide text-foreground uppercase">
                3rd-Person Author Bio <span className="text-primary">(Max 50 words)</span>
              </label>
              <textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full resize-none rounded-none border-4 border-border bg-background p-4 leading-relaxed font-medium text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
                <ShieldAlert size={20} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'saving'}
              className="w-full border-4 border-border bg-foreground p-4 font-bold tracking-widest text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
            >
              {status === 'saving' ? 'Initializing...' : 'Construct Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
