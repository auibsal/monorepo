'use client';

import React, { useState } from 'react';
// Requires: pnpm add next-themes
import { ThemeProvider } from 'next-themes';

import { createClient } from '@auibsal/auth/client';
import { Navbar, type NavbarLink } from '@auibsal/ui/components/layout/Navbar';

export default function ClientLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string | null;
}) {
  // 1. CRITICAL PERFORMANCE FIX: Memoize the Supabase client to prevent memory leaks and re-renders
  const [supabase] = useState(() => createClient());

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Redirects to the external public Web application, completely crossing the micro-frontend boundary
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

  // RBAC Link Injection
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
    // 2. ARCHITECTURAL FIX: Mount the ThemeProvider to execute the semantic variable inversion
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col">
        <Navbar 
          locale="en" 
          links={links} 
          homeUrl="/" 
          platform="nexus" 
          onSignOut={handleSignOut} 
        />

        {/* Main Content Area */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
