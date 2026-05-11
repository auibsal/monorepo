import type { Metadata } from 'next';
import { ubuntu, ubuntuArabic } from 'ui';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'SAL Dashboard',
  description: 'Internal Dashboard for the Society of Arts and Letters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      <body className={`${ubuntu.variable} ${ubuntuArabic.variable} font-sans antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
