import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ubuntu, ubuntuArabic } from '@/fonts';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'SAL Nexus',
  description: 'Internal Nexus for the Society of Arts and Letters',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  return (
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-auib-white text-auib-charcoal overflow-x-hidden">
        <ClientLayout role={role}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
