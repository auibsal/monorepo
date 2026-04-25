import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'
import '../globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';

// 1. Define the English Font
const ibmPlexSans = IBM_Plex_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex',
})

// 2. Define the Arabic Font
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
})

// 3. Define the Global Metadata
export const metadata: Metadata = {
  title: 'Iraqi Dominoes Association',
  description: 'The official governing body and digital rating platform for dominoes in Iraq.',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

// 4. Build the Root Layout
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${ibmPlexSans.variable} ${ibmPlexArabic.variable}`}>
      <body className="bg-federation-obsidian text-federation-ivory font-sans antialiased selection:bg-federation-ivory selection:text-federation-obsidian flex flex-col min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          <main className="flex-grow pt-24">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
