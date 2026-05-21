'use client';

import { useEffect, useState } from 'react';

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
  nexusUrl,
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
          className="hover:text-auib-charcoal text-sm font-bold uppercase tracking-widest text-white transition-colors"
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
            className="hover:text-auib-charcoal text-sm font-bold uppercase tracking-widest text-white transition-colors"
          >
            {targetLocale === 'en' ? 'English' : 'عربي'}
          </button>
          <div className="hidden h-6 w-1 bg-white/30 md:block"></div>
          {nexusUrl && (
            <a
              href={nexusUrl}
              className="hover:text-auib-charcoal text-sm font-bold uppercase tracking-widest text-white transition-colors"
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
    <nav className="bg-auib-red border-auib-charcoal sticky top-0 z-50 w-full border-b-4 text-white transition-colors duration-300">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link
          href={logoHref}
          onClick={() => setIsOpen(false)} // Ensure clicking logo closes mobile menu
          className="flex items-center text-white transition-opacity hover:opacity-90"
        >
          <Logo locale={locale} className="text-xs leading-tight text-white sm:text-sm" />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 md:flex">{rightModule}</div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
            className="hover:text-auib-red flex items-center gap-2 border-2 border-transparent p-2 text-sm font-bold uppercase tracking-widest transition-colors hover:border-white hover:bg-white md:hidden"
          >
            {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {isOpen && (
        <div className="bg-auib-charcoal border-auib-red shadow-brutalist-md absolute left-0 top-20 h-[calc(100vh-5rem)] w-full overflow-y-auto border-b-4 text-white md:hidden">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <ul className="flex flex-col gap-4 text-lg font-bold uppercase tracking-widest">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="hover:text-auib-red block py-2 transition-transform duration-200 hover:translate-x-2 rtl:hover:-translate-x-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-start gap-6 border-t-2 border-white/20 pt-8">
              {rightModule}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
