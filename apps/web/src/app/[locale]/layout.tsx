import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ubuntu, ubuntuArabic } from 'ui';
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
  const fontClass = locale === 'ar' ? ubuntuArabic.variable : ubuntu.variable;

  return (
    <html lang={locale} dir={dir} className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      <body className={`${fontClass} font-sans bg-auib-white text-auib-charcoal min-h-screen flex flex-col antialiased`}>
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
