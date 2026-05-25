import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import WebFooter from '@/components/layout/WebFooter';
import WebNavbarServer from '@/components/layout/WebNavbarServer';
// CRITICAL: Importing from local app, NOT the shared UI package
import { ubuntu, ubuntuArabic } from '@/fonts';
import { routing } from '@/i18n/routing';

// 1. Import the centralized Toaster for global notifications
import { Toaster } from '@auibsal/ui/components/ui/sonner';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org'),
  title: {
    default: 'AUIB Society of Arts and Letters',
    template: '%s | AUIB SAL',
  },
  description:
    'Official portal for the Society of Arts and Letters at the American University of Iraq Baghdad.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
    siteName: 'AUIB Society of Arts and Letters',
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

  // 2. Validate the incoming locale to prevent 500 errors on invalid URLs
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  
  // 3. Strictly type the locale for our custom components
  const typedLocale = locale as 'en' | 'ar';

  return (
    <html lang={locale} dir={dir} className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased">
        {/* Pass the locale down to the provider to avoid client-side mismatch */}
        <NextIntlClientProvider messages={messages} locale={locale}>
          <WebNavbarServer locale={typedLocale} />
          
          <main className="flex-grow">{children}</main>
          
          <WebFooter locale={typedLocale} />
        </NextIntlClientProvider>

        {/* 4. Global Notification Layer */}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
