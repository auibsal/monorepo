import './globals.css';
import { LayoutDashboard, Image as ImageIcon, FileText, Settings } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'The IDEA Suite | Curator Module' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden font-sans">
        <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col">
          <div className="p-6 border-b border-zinc-900">
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">The IDEA Suite</h1>
            <p className="text-[10px] uppercase tracking-widest text-amber-500 mt-1">Curator Module</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-amber-500 hover:bg-zinc-900/50 transition-colors">
              <LayoutDashboard size={16} /> Overview
            </Link>
            <Link href="/artworks" className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-amber-500 hover:bg-zinc-900/50 transition-colors">
              <ImageIcon size={16} /> Digital Museum
            </Link>
            <Link href="/blog" className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-amber-500 hover:bg-zinc-900/50 transition-colors">
              <FileText size={16} /> Publications
            </Link>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-zinc-950/50">
          {children}
        </main>
      </body>
    </html>
  );
}
