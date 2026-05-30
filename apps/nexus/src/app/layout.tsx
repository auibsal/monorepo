import type { Metadata } from 'next';
import { headers } from 'next/headers';
import ClientLayout from '@/components/layout/ClientLayout';
import { ubuntu, ubuntuArabic } from '@/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAL Nexus',
  description: 'Internal Nexus for the Society of Arts and Letters',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  return (
    // CRITICAL FIX: suppressHydrationWarning added to prevent React 19 theme mismatch errors
    <html
      lang="en"
      className={`${ubuntu.variable} ${ubuntuArabic.variable}`}
      suppressHydrationWarning
    >
      {/* Swapped hardcoded hexes to semantic bg-background and text-foreground tokens */}
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <ClientLayout role={role}>{children}</ClientLayout>
      </body>
    </html>
  );
}
