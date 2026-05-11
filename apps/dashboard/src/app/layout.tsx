import type { Metadata } from 'next';
import { Ubuntu } from 'next/font/google';
import './globals.css';
import ClientLayout from './ClientLayout';

const ubuntu = Ubuntu({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-ubuntu'
});

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
    <html lang="en" className={`${ubuntu.variable}`}>
      <body className={`${ubuntu.variable} font-sans antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
