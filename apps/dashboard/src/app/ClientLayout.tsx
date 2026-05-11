'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, type NavbarLink } from 'ui';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Conditionally initialize supabase only if the env vars are available
  // This allows the build process to pass during static generation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = supabaseUrl && supabaseKey
    ? createBrowserClient(supabaseUrl, supabaseKey)
    : null;

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  const links: NavbarLink[] = [
    { href: '/', label: 'Overview' },
    { href: '/submissions', label: 'Submissions' },
    { href: '/blog', label: 'Blog' },
    { href: '/journal', label: 'Journal' },
    { href: '/events', label: 'Events' },
    { href: '/users', label: 'Users' },
  ];

  const rightModule = (
    <button
      onClick={handleSignOut}
      className="text-sm font-bold text-auib-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
    >
      Sign Out
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-auib-charcoal text-auib-white font-sans">
      <Navbar
        locale="en"
        links={links}
        rightModule={rightModule}
        homeUrl="/"
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
