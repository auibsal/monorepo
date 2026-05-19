'use client';

import React from 'react';
import { Navbar, type NavbarLink } from '@auibsal/ui';
import { createClient } from '@auibsal/auth/client';

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

  const isAdmin = role === 'admin';
  const isEditorOrAdmin = role === 'editor' || role === 'admin';

  let links: NavbarLink[] = [
    { href: '/', label: 'Member Portal' },
    { href: '/events', label: 'Events' },
    { href: '/submit', label: 'Submit Work' },
    { href: '/settings/profile', label: 'Profile' },
  ];

  if (isEditorOrAdmin) {
    links = [
      ...links,
      { href: '/editorial/submissions', label: 'Submissions (Ed)' },
      { href: '/editorial/blog', label: 'Blog (Ed)' },
      { href: '/editorial/journal', label: 'Journal (Ed)' },
      { href: '/editorial/events', label: 'Events (Ed)' },
    ];
  }

  if (isAdmin) {
    links = [
      ...links,
      { href: '/admin/users', label: 'Users (Admin)' },
      { href: '/admin/logs', label: 'Logs (Admin)' },
    ];
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        locale="en"
        links={links}
        homeUrl="/"
        platform="nexus"
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
