import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Ubuntu } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import './globals.css';

const ubuntu = Ubuntu({ 
  weight: ['300', '400', '500', '700'], 
  subsets: ['latin'],
  variable: '--font-ubuntu'
});

const ubuntuArabic = Ubuntu({ 
  weight: ['400', '700'], 
  subsets: ['arabic'],
  variable: '--font-ubuntu-arabic'
});

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? ubuntuArabic.variable : ubuntu.variable;

  return (
    <html lang={locale} dir={dir}>
      <body className={`${fontClass} font-sans bg-auib-white text-auib-charcoal min-h-screen flex flex-col antialiased`}>
        <NextIntlClientProvider messages={messages}>
          
          <Navbar locale={locale} />
          
          <main className="flex-grow">
            {children}
          </main>
          
          <Footer locale={locale} />

        </NextIntlClientProvider>
      </body>
    </html>
  );
}
