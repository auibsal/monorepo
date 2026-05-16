import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ubuntu, ubuntuArabic } from '@/fonts';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'SAL Nexus',
  description: 'Internal Nexus for the Society of Arts and Letters',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Await the headers injected by our middleware.ts
  const headersList = await headers();
  
  // 2. Extract the secure role
  const role = headersList.get('x-user-role');

  return (
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-auib-white text-auib-charcoal">
        {/* 3. Pass the role straight into the client wrapper instantly */}
        <ClientLayout role={role}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
