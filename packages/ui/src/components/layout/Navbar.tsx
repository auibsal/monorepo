'use client';

import { Menu, X } from 'lucide-react';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// 1. Synchronized with the named export from the previous step
import { Logo } from '../Logo';

/**
 * NavbarLink
 *
 * @description Standardized execution for NavbarLink.
 */
export interface NavbarLink {
  href: string;
  label: string;
}

/**
 * NavbarProps
 *
 * @description Standardized execution for NavbarProps.
 */
export interface NavbarProps {
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

/**
 * Navbar
 *
 * @description Standardized execution for Navbar.
 */
export function Navbar({
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

  // Mobile Scroll Lock
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
          type="button"
          onClick={onSignOut}
          className="text-sm font-bold tracking-widest text-white uppercase transition-colors hover:text-auib-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red rounded-sm"
        >
          Sign Out
        </button>
      );
    }

    if (platform === 'web') {
      return (
        <>
          <button
            type="button"
            onClick={onLanguageToggle}
            className="text-sm font-bold tracking-widest text-white uppercase transition-colors hover:text-auib-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red rounded-sm"
          >
            {targetLocale === 'en' ? 'English' : 'عربي'}
          </button>
          <div className="hidden h-6 w-1 bg-white/30 md:block"></div>
          {nexusUrl && (
            <a
              href={nexusUrl}
            className="text-sm font-bold tracking-widest text-white uppercase transition-colors hover:text-auib-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red rounded-sm"
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
    <nav
      dir="auto"
      className="sticky top-0 z-50 w-full border-b-4 border-auib-charcoal bg-auib-red text-white transition-colors duration-300"
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link
          href={logoHref}
          onClick={() => setIsOpen(false)}
          className="flex items-center text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red rounded-sm"
        >
          <Logo locale={locale} className="text-xs leading-tight text-white sm:text-sm" />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 md:flex">{rightModule}</div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
            className="flex items-center gap-2 border-2 border-transparent p-2 text-sm font-bold tracking-widest uppercase transition-colors hover:border-white hover:bg-white hover:text-auib-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red"
          >
            {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {isOpen && (
        // 2. Swapped left-0 to inset-x-0 for flawless BiDi absolute positioning
        <div className="absolute top-20 inset-x-0 h-[calc(100vh-5rem)] w-full overflow-y-auto border-b-4 border-auib-red bg-auib-charcoal text-white shadow-brutalist-md">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <ul className="flex flex-col gap-4 text-lg font-bold tracking-widest uppercase">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 transition-transform duration-200 hover:translate-x-2 hover:text-auib-red rtl:hover:-translate-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-charcoal rounded-sm"
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
