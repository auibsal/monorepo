'use client';

import Link from 'next/link';
import { useState } from 'react';

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-white/10 sticky top-0 z-50 bg-[#020202]/90 backdrop-blur-xl">
      <div className="flex justify-between items-stretch h-20 md:px-8 px-4">
        
        {/* ASSOCIATION BRANDING */}
        <Link href="/" className="flex items-center gap-6 group py-4">
          <div className="w-12 h-12 bg-black flex flex-col justify-between p-1.5 rounded-sm border border-white/20 transform -rotate-12 group-hover:rotate-0 group-hover:border-red-500 transition-all duration-500 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            <div className="w-full h-[1px] bg-white/50"></div>
            <div className="w-2.5 h-2.5 bg-white rounded-full self-end group-hover:bg-red-500 transition-colors"></div>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-black tracking-tighter leading-none text-white">I.D.A.</h1>
            <p className="text-[9px] font-mono text-white/40 tracking-[0.3em] mt-1 uppercase">Iraqi Domino Association</p>
          </div>
        </Link>

        {/* DESKTOP REGISTRY NAVIGATION */}
        <div className="hidden md:flex items-stretch font-mono text-xs uppercase tracking-widest text-white/60">
          <Link href="/arena" className="flex items-center px-6 border-l border-white/10 hover:bg-white/5 hover:text-white transition-colors relative group">
            Sanctioned Play
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </Link>
          <Link href="/leaderboard" className="flex items-center px-6 border-l border-white/10 hover:bg-white/5 hover:text-white transition-colors relative group">
            The Registry
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </Link>
          <Link href="/rules" className="flex items-center px-6 border-l border-white/10 hover:bg-white/5 hover:text-white transition-colors relative group">
            Rulebook
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </Link>
          <Link href="/dev" className="flex items-center px-6 border-l border-r border-white/10 hover:bg-white/5 text-red-500/80 hover:text-red-500 transition-colors relative group">
            Engine Oracle
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </Link>
        </div>

        {/* MEMBER AUTHENTICATION */}
        <div className="hidden md:flex items-center ml-8">
          <button className="bg-red-600 text-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300 ease-out hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            Member Portal
          </button>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button 
          className="md:hidden flex items-center text-white font-mono text-xs uppercase tracking-widest"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors">
            {isMobileMenuOpen ? 'CLOSE' : 'MENU'}
          </span>
        </button>
      </div>

      {/* MOBILE REGISTRY */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#020202] border-t border-white/10 font-mono text-sm uppercase tracking-widest flex flex-col absolute w-full h-screen z-40">
          <Link href="/arena" className="p-6 border-b border-white/5 hover:bg-white/5 hover:text-red-500">Sanctioned Play</Link>
          <Link href="/leaderboard" className="p-6 border-b border-white/5 hover:bg-white/5 hover:text-red-500">The Registry</Link>
          <Link href="/rules" className="p-6 border-b border-white/5 hover:bg-white/5 hover:text-red-500">Official Rulebook</Link>
          <Link href="/dev" className="p-6 border-b border-white/5 text-red-500 hover:bg-white/5">Engine Oracle</Link>
          <button className="w-full text-left p-6 bg-red-600 text-white font-bold mt-auto mb-20">Access Member Portal</button>
        </div>
      )}
    </nav>
  );
};
