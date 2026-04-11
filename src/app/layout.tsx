import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// ... (keep the font definitions and metadata exactly the same) ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexArabic.variable}`}>
      <body className="bg-federation-obsidian text-federation-ivory font-sans antialiased selection:bg-federation-ivory selection:text-federation-obsidian flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow pt-24"> {/* Added pt-24 to push content below fixed navbar */}
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
