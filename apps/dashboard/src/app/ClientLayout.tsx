'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from 'ui';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-auib-white text-auib-charcoal overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b-4 border-auib-charcoal bg-auib-charcoal text-auib-white absolute w-full z-20">
        <h1 className="text-xl font-bold tracking-tight uppercase text-auib-red">Dashboard</h1>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 border-2 border-auib-white hover:bg-auib-white hover:text-auib-charcoal transition-colors"
        >
          {isSidebarOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-auib-white border-r-4 border-auib-charcoal flex flex-col
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 pt-20 md:pt-0' : '-translate-x-full'}
      `}>
        <div className="hidden md:block p-6 border-b-4 border-auib-charcoal bg-auib-charcoal text-auib-white">
          <Logo locale="en" className="text-sm text-auib-white mb-2" />
          <h1 className="text-xl font-bold tracking-tight uppercase mt-4 text-auib-red">Dashboard</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link onClick={() => setIsSidebarOpen(false)} href="/" className="block px-3 py-3 text-sm font-bold uppercase tracking-widest border-2 border-transparent hover:border-auib-charcoal hover:bg-auib-charcoal hover:text-auib-white transition-colors">Overview</Link>
          <Link onClick={() => setIsSidebarOpen(false)} href="/submissions" className="block px-3 py-3 text-sm font-bold uppercase tracking-widest border-2 border-transparent hover:border-auib-charcoal hover:bg-auib-charcoal hover:text-auib-white transition-colors">Submissions</Link>
          <Link onClick={() => setIsSidebarOpen(false)} href="/blog" className="block px-3 py-3 text-sm font-bold uppercase tracking-widest border-2 border-transparent hover:border-auib-charcoal hover:bg-auib-charcoal hover:text-auib-white transition-colors">Blog</Link>
          <Link onClick={() => setIsSidebarOpen(false)} href="/journal" className="block px-3 py-3 text-sm font-bold uppercase tracking-widest border-2 border-transparent hover:border-auib-charcoal hover:bg-auib-charcoal hover:text-auib-white transition-colors">Journal</Link>
          <Link onClick={() => setIsSidebarOpen(false)} href="/events" className="block px-3 py-3 text-sm font-bold uppercase tracking-widest border-2 border-transparent hover:border-auib-charcoal hover:bg-auib-charcoal hover:text-auib-white transition-colors">Events</Link>
          <Link onClick={() => setIsSidebarOpen(false)} href="/users" className="block px-3 py-3 text-sm font-bold uppercase tracking-widest border-2 border-transparent hover:border-auib-charcoal hover:bg-auib-charcoal hover:text-auib-white transition-colors">Users</Link>
        </nav>
      </aside>

      {/* Main Content Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-auib-charcoal/50 z-0 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-auib-white pt-24 md:pt-8 w-full">
        {children}
      </main>
    </div>
  );
}
