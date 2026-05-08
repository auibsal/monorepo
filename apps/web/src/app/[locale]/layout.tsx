import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Ubuntu } from 'next/font/google';
import localFont from 'next/font/local'; // Import the local loader
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import '../globals.css';

// 1. Keep Google Fonts for the English (Latin) version
const ubuntu = Ubuntu({ 
  weight: ['300', '400', '500', '700'], 
  subsets: ['latin'],
  variable: '--font-ubuntu'
});

// 2. Use localFont for the Ubuntu Arabic files
const ubuntuArabic = localFont({
  src: [
    {
      path: '../../../../public/fonts/UbuntuArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../../public/fonts/UbuntuArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-ubuntu-arabic'
});

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
