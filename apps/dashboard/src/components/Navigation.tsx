'use client';

import { useState } from 'react';
import { createClient } from '@repo/supabase/client';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, LayoutDashboard, Palette } from 'lucide-react';
import Link from 'next/link';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const NavLinks = () => (
    <>
      <Link href="/" className="flex items-center gap-3 p-3 hover:bg-zinc-200 transition-colors uppercase text-xs tracking-widest font-bold">
        <LayoutDashboard size={16} /> Curations
      </Link>
      <Link href="/artworks" className="flex items-center gap-3 p-3 hover:bg-zinc-200 transition-colors uppercase text-xs tracking-widest font-bold">
        <Palette size={16} /> Artworks
      </Link>
      
      <div className="flex-grow" />
      
      <button onClick={handleLogout} className="flex items-center gap-3 p-3 hover:bg-red-50 text-red-600 transition-colors uppercase text-xs tracking-widest text-left mt-auto">
        <LogOut size={16} /> Logout
      </button>
    </>
  );

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 bg-white z-50 relative">
        <span className="font-black uppercase tracking-widest text-amber-500 text-lg">IDEA SUITE</span>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-zinc-200 flex flex-col p-4 z-40 shadow-xl h-[calc(100vh-4rem)]">
          <NavLinks />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 h-screen border-r border-zinc-200 bg-white fixed p-6">
        <span className="font-black uppercase tracking-widest text-amber-500 text-xl mb-12">IDEA SUITE</span>
        <NavLinks />
      </div>
    </>
  );
}
