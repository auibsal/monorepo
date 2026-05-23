'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Logo from '../Logo';

export interface NavbarLink {
  href: string;
  label: string;
}

export interface NavbarProps {
  // 1. Strict literal types mapped perfectly to your Logo and routing setup
  locale: 'en' | 'ar';
  links: NavbarLink[];
  homeUrl?: string;
  platform?: 'web' | 'nexus';

  // Nexus-specific props
  onSignOut?: () => void;

  // Web-specific props
  onLanguageToggle?: () => void;
  targetLocale?: 'en' | 'ar';
  nexusUrl?: string;
}

export default function Navbar({
  locale,
  links,
  homeUrl,
  platform,
  onSignOut,
  onLanguageToggle,
  targetLocale,
  nexusUrl
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const logoHref = homeUrl || `/${locale}`;

  // 2. Mobile Scroll Lock
  // Prevents the page from scrolling underneath the mobile menu overlay
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const renderPlatformActions = () => {
    if (platform === 'nexus') {
      return (
        <button
          onClick={onSignOut}
          className="text-sm font-bold text-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
        >
          Sign Out
        </button>
      );
    }

    if (platform === 'web') {
      return (
        <>
          <button
            onClick={onLanguageToggle}
            className="text-sm font-bold text-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
          >
            {targetLocale === 'en' ? 'English' : 'عربي'}
          </button>
          <div className="h-6 w-1 bg-white/30 hidden md:block"></div>
          {nexusUrl && (
            <a
              href={nexusUrl}
              className="text-sm font-bold text-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
            >
              Nexus
            </a>
          )}
        </>
      );
    }

    return null;
  };

  const rightModule = renderPlatformActions();

  return (
    // 3. Removed the useless backdrop-blur for pure, flat brutalism
    <nav className="sticky top-0 z-50 w-full bg-auib-red border-b-4 border-auib-charcoal text-white transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">

        <Link 
          href={logoHref} 
          onClick={() => setIsOpen(false)} // Ensure clicking logo closes mobile menu
          className="flex items-center text-white hover:opacity-90 transition-opacity"
        >
          <Logo locale={locale} className="text-xs sm:text-sm leading-tight text-white" />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            {rightModule}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
            className="p-2 border-2 border-transparent hover:border-white hover:bg-white hover:text-auib-red transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-sm"
          >
            {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {isOpen && (
        <div className="absolute top-20 left-0 w-full h-[calc(100vh-5rem)] overflow-y-auto bg-auib-charcoal text-white border-b-4 border-auib-red shadow-brutalist-md">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <ul className="flex flex-col gap-4 font-bold uppercase tracking-widest text-lg">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 hover:text-auib-red hover:translate-x-2 rtl:hover:-translate-x-2 transition-transform duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-8 border-t-2 border-white/20 flex flex-col items-start gap-6">
              {rightModule}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
