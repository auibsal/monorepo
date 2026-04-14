'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPlayer() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    // 1. Call Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This metadata is caught by our Postgres trigger to build the public profile
        data: {
          first_name: firstName,
          last_name: lastName,
          arabic_name: arabicName || null,
        }
      }
    });

    setIsLoading(false);

    // 2. Handle Authentication Response
    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data.user) {
      // Success! Redirect to the secure dashboard
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        
        <div className="text-center mb-10">
          <h2 className="text-sm font-medium tracking-widest uppercase opacity-60 mb-2 text-red-500">
            Secure IDA Portal
          </h2>
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight mb-4">
            Claim Player ID
          </h1>
          <p className="font-light opacity-80 text-sm max-w-md mx-auto">
            Registration establishes your immutable mathematical ELO profile. Enter your legal credentials as they would appear on a national identification document.
          </p>
        </div>

        <div className="bg-federation-ivory/5 border border-federation-ivory/20 p-8 rounded-sm shadow-2xl">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-950 border border-red-500 text-red-200 text-sm rounded-sm">
              <span className="font-bold uppercase tracking-wider">Error: </span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegistration} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                  First Name (English)
                </label>
                <input 
                  type="text" 
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                  placeholder="e.g. Ahmed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                  Last Name (English)
                </label>
                <input 
                  type="text" 
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                  placeholder="e.g. Al-Fadhli"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70 flex justify-between">
                <span>Full Name (Arabic)</span>
                <span className="opacity-50 font-normal normal-case tracking-normal">Optional</span>
              </label>
              <input 
                type="text" 
                dir="rtl"
                value={arabicName}
                onChange={(e) => setArabicName(e.target.value)}
                className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors font-medium"
                placeholder=""
                style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                Email Address
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                placeholder="player@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                Secure Password
              </label>
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input 
                type="checkbox" 
                required
                className="mt-1 bg-black border-federation-ivory/30 appearance-none w-4 h-4 border checked:bg-federation-ivory checked:border-federation-ivory transition-colors cursor-pointer" 
              />
              <p className="text-xs font-light opacity-60 leading-relaxed">
                By registering, I unconditionally agree to the IDA <Link href="/charter" className="underline hover:text-white">Supreme Charter</Link> and the <Link href="/rules" className="underline hover:text-white">Official Rulebook</Link>. I understand that manipulating ELO data is grounds for permanent expulsion.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-4 mt-4 font-bold uppercase tracking-widest rounded-sm transition-all duration-200 flex justify-center items-center gap-3 ${isLoading ? 'bg-federation-ivory/50 text-federation-obsidian cursor-not-allowed' : 'bg-federation-ivory text-federation-obsidian hover:bg-white'}`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-federation-obsidian/30 border-t-federation-obsidian rounded-full animate-spin"></div>
                  Generating Identity...
                </>
              ) : (
                'Initialize Player Profile'
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
