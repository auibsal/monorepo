'use client';

import React from 'react';
import { Navbar, type NavbarLink } from 'ui';
import { createClient } from 'auth/client';

export default function ClientLayout({ 
  children, 
  role 
}: { 
  children: React.ReactNode; 
  role: string | null;
}) {
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // CRITICAL: Redirect to the external public Web application, not a local relative path
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
    window.location.href = `${webUrl}/login`;
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
      className="text-sm font-bold text-white hover:text-auib-red transition-colors uppercase tracking-widest"
    >
      Sign Out
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        locale="en"
        links={links}
        rightModule={rightModule}
        homeUrl="/"
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
