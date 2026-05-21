import type { Metadata } from 'next';

import WebFooter from '@/components/layout/WebFooter';
import WebNavbarServer from '@/components/layout/WebNavbarServer';
// CRITICAL: Importing from local app, NOT the shared UI package
import { ubuntu, ubuntuArabic } from '@/fonts';
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
    // Removed the hardcoded images array; Next.js handles opengraph-image.png natively
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
  const messages = await getMessages();

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      {/* Swapped to semantic background/foreground tokens to preserve dark mode compatibility */}
      <body className="bg-background text-foreground flex min-h-screen flex-col overflow-x-hidden font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <WebNavbarServer locale={locale} />
          <main className="flex-grow">{children}</main>
          <WebFooter locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
