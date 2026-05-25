'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // CRITICAL FIX: Route locally since Nexus owns the authentication layer
    router.push('/login');
    router.refresh(); // Forces Next.js to re-evaluate the server layout and middleware
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col">
        <Navbar 
          locale="en" 
          links={links} 
          homeUrl="/" 
          platform="nexus" 
          onSignOut={handleSignOut} 
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
