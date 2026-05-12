'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '../../';

export interface NavbarLink {
  href: string;
  label: string;
}

export interface NavbarProps {
  locale: string;
  links: NavbarLink[];
  rightModule?: React.ReactNode;
  homeUrl?: string; // Optional URL for the logo click
}

export default function Navbar({ locale, links, rightModule, homeUrl }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const logoHref = homeUrl || `/${locale}`;

  return (
    <nav className="sticky top-0 z-50 w-full bg-auib-red backdrop-blur-sm border-b-4 border-auib-charcoal text-auib-white">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">

        <Link href={logoHref} className="flex items-center text-auib-white hover:opacity-90 transition-opacity">
          <Logo locale={locale} className="text-xs sm:text-sm leading-tight text-auib-white" />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            {rightModule}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 border-2 border-transparent hover:border-auib-white hover:bg-auib-white hover:text-auib-red transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-sm"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {isOpen && (
        <div className="absolute top-20 left-0 w-full bg-auib-charcoal text-auib-white border-b-4 border-auib-red shadow-xl">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <ul className="flex flex-col gap-4 font-bold uppercase tracking-widest text-lg">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 hover:text-auib-red hover:translate-x-2 transition-all"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-8 border-t border-auib-white/20 md:hidden flex items-center gap-4">
              {rightModule}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
