// 1. Import the centralized Toaster for global notifications
import { Toaster } from '@auibsal/ui/components/ui/sonner';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import WebFooter from '@/components/layout/WebFooter';
import WebNavbarServer from '@/components/layout/WebNavbarServer';
// CRITICAL: Importing from local app, NOT the shared UI package
import { ubuntu, ubuntuArabic } from '@/fonts/fonts';
import { routing } from '@/i18n/routing';

import '../globals.css';

import { constructMetadata } from '@auibsal/seo/metadata';

/**
 * metadata
 *
 * @description Standardized execution for metadata.
 */
export const metadata: Metadata = constructMetadata({ title: "AUIB Society of Arts and Letters", description: "Official portal for the Society of Arts and Letters at the American University of Iraq Baghdad." });


export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 2. Validate the incoming locale to prevent 500 errors on invalid URLs
  const isValidLocale = routing.locales.includes(locale as 'en' | 'ar');
  if (!isValidLocale) {
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
