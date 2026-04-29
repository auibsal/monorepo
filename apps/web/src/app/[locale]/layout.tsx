import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { CustomCursor } from '@/components/CustomCursor';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import '../globals.css';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className="flex flex-col min-h-screen bg-[#f8f8f8] text-[#111111]">
        <NextIntlClientProvider messages={messages}>
          <CustomCursor />
          
          <Navbar />
          
          {/* Main content grows to push footer down */}
          <main className="flex-grow">
            {children}
          </main>
          
          <Footer />

        </NextIntlClientProvider>
      </body>
    </html>
  );
}
