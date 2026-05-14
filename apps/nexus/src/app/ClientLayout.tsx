'use client';

import React, { useEffect, useState } from 'react';

import { Navbar, type NavbarLink } from 'ui';
import { createBrowserClient } from '@supabase/ssr';


export default function ClientLayout({ children }: { children: React.ReactNode }) {

  const [role, setRole] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    async function fetchRole() {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
          if (data) {
            setRole(data.role);
          }
        }
      }
    }
    fetchRole();
  }, [supabase]);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Redirect to web app locally if it's running on 3000
    if (process.env.NODE_ENV === 'development') {
      window.location.href = 'http://localhost:3000/en/login';
    } else {
      window.location.href = '/en/login';
    }
  };

  const isEditor = role === 'editor' || role === 'admin';

  const links: NavbarLink[] = isEditor ? [
    { href: '/', label: 'Overview' },
    { href: '/submissions', label: 'Submissions' },
    { href: '/blog', label: 'Blog' },
    { href: '/journal', label: 'Journal' },
    { href: '/events', label: 'Events' },
    { href: '/users', label: 'Users' },
  ] : [
    { href: '/', label: 'Member Portal' },
    { href: '/submit', label: 'Submit Work' },
    { href: '/guidelines', label: 'Guidelines' },
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
