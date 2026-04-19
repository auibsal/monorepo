'use client';

import Link from 'next/link';
import { useState } from 'react';

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
      <div className="flex justify-between items-center p-4 md:px-8">
        
        {/* BRANDING */}
        <Link href="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 bg-white text-black flex flex-col justify-between p-1 rounded-sm border border-gray-400 transform -rotate-12 group-hover:rotate-0 transition-transform duration-300">
            <div className="w-2 h-2 bg-black rounded-full"></div>
            <div className="w-full h-[1px] bg-gray-400"></div>
            <div className="w-2 h-2 bg-black rounded-full self-end"></div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none group-hover:text-red-500 transition-colors">I.D.A.</h1>
            <p className="text-[10px] font-mono text-white/50 tracking-widest">GLOBAL FEDERATION</p>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden md:flex gap-8 font-mono text-xs uppercase tracking-widest text-white/70">
          <Link href="/arena" className="hover:text-white hover:underline decoration-red-500 underline-offset-8 transition-all">The Arena</Link>
          <Link href="/leaderboard" className="hover:text-white hover:underline decoration-red-500 underline-offset-8 transition-all">Rankings</Link>
          <Link href="/rules" className="hover:text-white hover:underline decoration-red-500 underline-offset-8 transition-all">Regulations</Link>
          <Link href="/dev" className="hover:text-red-500 hover:underline decoration-red-500 underline-offset-8 transition-all text-red-500/70">Engine</Link>
        </div>

        {/* ACTION / AUTH */}
        <div className="hidden md:block">
          <button className="bg-white text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
            Authenticate
          </button>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button 
          className="md:hidden text-white font-mono text-xs uppercase tracking-widest border border-white/20 px-3 py-1"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* MOBILE NAVIGATION DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#050505] border-t border-white/10 font-mono text-sm uppercase tracking-widest flex flex-col">
          <Link href="/arena" className="p-4 border-b border-white/5 hover:bg-white/5 hover:text-red-500">The Arena</Link>
          <Link href="/leaderboard" className="p-4 border-b border-white/5 hover:bg-white/5 hover:text-red-500">Rankings</Link>
          <Link href="/rules" className="p-4 border-b border-white/5 hover:bg-white/5 hover:text-red-500">Regulations</Link>
          <Link href="/dev" className="p-4 border-b border-white/5 text-red-500 hover:bg-white/5">Oracle Engine</Link>
          <button className="w-full text-left p-4 bg-red-600 text-white font-bold">Authenticate</button>
        </div>
      )}
    </nav>
  );
};
