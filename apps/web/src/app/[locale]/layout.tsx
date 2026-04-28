import { NextIntlClientProvider, useMessages } from 'next-intl';
import '../globals.css';
// Add curly braces around Navbar and Footer
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = useMessages();

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
