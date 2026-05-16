import type { Metadata } from 'next';
// CRITICAL: Importing from local app, NOT the shared UI package
import { ubuntu, ubuntuArabic } from '@/fonts';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'SAL Nexus',
  description: 'Internal Nexus for the Society of Arts and Letters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-auib-white text-auib-charcoal">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
