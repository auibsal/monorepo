import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
// CRITICAL: Importing from local app, NOT the shared UI package
import { ubuntu, ubuntuArabic } from '@/fonts';
import WebNavbar from '@/components/layout/WebNavbar';
import Footer from '@/components/layout/Footer';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org'),
  title: {
    default: 'AUIB Society of Arts and Letters',
    template: '%s | AUIB SAL',
  },
  description: 'Official portal for the Society of Arts and Letters at the American University of Iraq Baghdad.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
    url: '/',
    siteName: 'AUIB Society of Arts and Letters',
    images: [
      {
        url: '/og-image.png', // Create a 1200x630 brutalist banner and put it in apps/web/public
        width: 1200,
        height: 630,
        alt: 'AUIB Society of Arts and Letters',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params; 
  const messages = await getMessages();
  
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      {/* CRITICAL: Added overflow-x-hidden to kill the mobile scroll bug, and anchored the global theme colors */}
      <body className="font-sans antialiased min-h-screen flex flex-col bg-auib-white text-auib-charcoal overflow-x-hidden">
        <NextIntlClientProvider messages={messages}>
          <WebNavbar locale={locale} />
          <main className="flex-grow">
            {children}
          </main>
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
