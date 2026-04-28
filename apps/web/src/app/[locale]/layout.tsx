import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import '../globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // 1. Await the params explicitly
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  // 2. Fetch messages asynchronously 
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-zinc-950 text-zinc-50 font-sans antialiased selection:bg-amber-500 selection:text-zinc-950">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
