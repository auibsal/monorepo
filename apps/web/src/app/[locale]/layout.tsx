import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
// CRITICAL: Importing from local app, NOT the shared UI package
import { ubuntu, ubuntuArabic } from '@/fonts';
import WebNavbar from '@/components/layout/WebNavbar';
import Footer from '@/components/layout/Footer';
import '../globals.css';

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
