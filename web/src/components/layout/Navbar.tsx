'use client'; // Required for scroll event listeners and state

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Detect scroll to trigger glassy effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Rulebook', path: '/rules' },
    { name: 'Affiliates', path: '/affiliates' },
    { name: 'Arbiters', path: '/arbiters' },
    { name: 'Partners', path: '/partners' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-federation-obsidian/90 backdrop-blur-md border-b border-federation-ivory/10 py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex justify-between items-center">
        
        {/* Logo Area */}
        <Link href="/" className="group flex flex-col">
          <span className="text-sm font-medium tracking-wider opacity-80 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
            الاتحاد العراقي للدومينو
          </span>
          <span className="text-xl font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-400 group-hover:to-white transition-all">
            IDF
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.path}
              className={`text-sm uppercase tracking-widest font-medium transition-colors hover:text-federation-ivory ${pathname === link.path ? 'text-federation-ivory border-b border-federation-ivory pb-1' : 'text-federation-ivory/60'}`}
            >
              {link.name}
            </Link>
          ))}
          <Link 
            href="/dashboard" 
            className="ml-4 px-6 py-2 bg-federation-ivory text-federation-obsidian text-sm font-bold uppercase tracking-wider rounded-sm hover:scale-105 transition-transform"
          >
            Player Portal
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-federation-ivory p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="sr-only">Open menu</span>
          <div className="w-6 h-0.5 bg-federation-ivory mb-1.5 transition-all"></div>
          <div className="w-6 h-0.5 bg-federation-ivory mb-1.5 transition-all"></div>
          <div className="w-6 h-0.5 bg-federation-ivory transition-all"></div>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-federation-obsidian border-b border-federation-ivory/10 py-4 px-6 flex flex-col gap-4 shadow-2xl">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg uppercase tracking-widest font-medium text-federation-ivory/80 hover:text-federation-ivory"
            >
              {link.name}
            </Link>
          ))}
          <Link 
            href="/dashboard" 
            className="mt-4 text-center py-3 bg-federation-ivory text-federation-obsidian font-bold uppercase tracking-wider rounded-sm"
          >
            Access Player Portal
          </Link>
        </div>
      )}
    </nav>
  );
}
