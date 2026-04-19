import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

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

// 4. Build the Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexArabic.variable}`}>
      <body className="bg-federation-obsidian text-federation-ivory font-sans antialiased selection:bg-federation-ivory selection:text-federation-obsidian flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow pt-24">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
