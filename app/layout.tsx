import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'

// Import IBM Plex for English
const ibmPlexSans = IBM_Plex_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex',
})

// Import IBM Plex for Arabic (Crucial for the official name and bilingual support)
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
})

export const metadata: Metadata = {
  title: 'الاتحاد العراقي للدومينو | Iraqi Dominoes Federation',
  description: 'The official governing body and digital rating platform for dominoes in Iraq.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexArabic.variable}`}>
      {/* Set global background to Obsidian and text to Ivory */}
      <body className="bg-federation-obsidian text-federation-ivory font-sans antialiased selection:bg-federation-ivory selection:text-federation-obsidian">
        <main className="min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
