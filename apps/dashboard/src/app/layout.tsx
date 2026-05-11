import type { Metadata } from 'next';
import { Ubuntu } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import ClientLayout from './ClientLayout';

const ubuntu = Ubuntu({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-ubuntu'
});

const ubuntuArabic = localFont({
  src: [
    {
      path: '../../public/fonts/UbuntuArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/UbuntuArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-ubuntu-arabic'
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
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      <body className={`${ubuntu.variable} ${ubuntuArabic.variable} font-sans antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
