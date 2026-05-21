'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@auibsal/auth/client';
import { Save, AlertTriangle, CheckSquare, User, Mail, BookOpen } from 'lucide-react';

export default function ProfilePage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [bio, setBio] = useState('');

  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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
        }
      });

      if (authUpdateError) throw authUpdateError;

      setStatus('success');
      
      // Clear success message after 3 seconds to return to idle state
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unknown exception occurred during transmission.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="space-y-12">
        <div className="flex justify-between items-center border-b-4 border-border pb-4">
          <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground">Profile Settings</h2>
        </div>
        <div className="bg-card p-12 border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] flex items-center justify-center">
           <div className="animate-pulse flex items-center gap-4 text-foreground/50 font-bold uppercase tracking-widest">
             <div className="w-4 h-4 bg-primary rounded-none animate-spin"></div>
             Decrypting Profile Data...
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground">Profile Settings</h2>
      </div>

      <form onSubmit={handleSave} className="bg-card p-6 md:p-12 border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] space-y-8">
        
        {/* Core Identity Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3 border-b-2 border-border/20 pb-2">
            <User className="text-primary" size={24} />
            Core Identity
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label htmlFor="fullName" className="block text-sm font-bold uppercase tracking-wide text-foreground">
                Legal Full Name <span className="text-primary">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                placeholder="e.g. Shaheen Farjo"
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wide text-foreground">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  disabled
                  value={email}
                  className="w-full p-4 border-4 border-border bg-background/50 text-foreground/50 cursor-not-allowed rounded-none font-bold"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30" size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Identity locked. Contact sysadmin to modify.</p>
            </div>
          </div>
        </div>

        {/* Academic Affiliation Section */}
        <div className="space-y-6 pt-4 border-t-4 border-border/10">
          <h3 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3 border-b-2 border-border/20 pb-2">
            <BookOpen className="text-primary" size={24} />
            Academic Affiliation
          </h3>
          
          <div className="p-6 border-4 border-border/10 bg-foreground/5 space-y-6">
            <label htmlFor="isExternal" className="flex items-center space-x-3 text-sm font-bold uppercase tracking-wide text-foreground cursor-pointer">
              <input
                id="isExternal"
                type="checkbox"
                checked={isExternal}
                onChange={(e) => {
                  setIsExternal(e.target.checked);
                  if (e.target.checked) setStudentId('');
                }}
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
                  placeholder="e.g. 123456 / Entrepreneurship"
                  className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground"
                />
              </div>
            )}
          </div>
        </div>

        {/* Biography Section */}
        <div className="space-y-3 pt-4 border-t-4 border-border/10">
          <label htmlFor="bio" className="block text-sm font-bold uppercase tracking-wide text-foreground">
            3rd-Person Author Bio <span className="text-primary">(Max 50 words)</span>
          </label>
          <textarea
            id="bio"
            rows={4}
            value={bio}
            placeholder="e.g. Founder of The IDEA IQ Inc. majoring in Entrepreneurship with a minor in Literature..."
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-medium resize-none leading-relaxed text-foreground"
          />
          <div className={`text-xs font-bold text-right uppercase tracking-widest ${bio.trim().split(/\s+/).length > 50 ? 'text-primary' : 'text-foreground/50'}`}>
            {bio.trim() ? bio.trim().split(/\s+/).length : 0} / 50 words
          </div>
        </div>

        {/* System Feedback Matrix */}
        {status === 'error' && (
          <div className="p-4 border-4 border-red-500 bg-background text-red-500 text-sm font-bold flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <span className="break-words">{errorMessage}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 border-4 border-green-500 bg-background text-green-500 text-sm font-bold flex items-center gap-3">
            <CheckSquare size={20} className="flex-shrink-0" />
            <span>Profile parameters successfully synchronized.</span>
          </div>
        )}

        {/* Command Execution */}
        <div className="pt-8 border-t-4 border-border mt-8">
          <button
            type="submit"
            disabled={status === 'saving' || status === 'loading'}
            className="w-full bg-foreground text-background font-bold uppercase tracking-widest px-6 py-4 border-4 border-border hover:bg-primary hover:border-primary transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] md:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] md:hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1 text-sm md:text-base"
          >
            {status === 'saving' ? (
              <>
                <div className="w-4 h-4 bg-background rounded-none animate-spin"></div>
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
