'use client';

import { motion } from 'framer-motion';
import { Link, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export function Navbar() {
  const locale = useLocale();
  const pathname = usePathname();
  
  // Determine the opposite language for the toggle button
  const nextLocale = locale === 'en' ? 'ar' : 'en';
  const toggleText = locale === 'en' ? 'عربي' : 'ENG';

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 w-full z-40 px-6 md:px-12 py-8 flex items-center justify-between pointer-events-none"
    >
      {/* LEFT: Logo / Home Link */}
      <div className="pointer-events-auto">
        <Link href="/" className="group flex items-center gap-3">
          <img src="/logo-samoon.png" alt="TIC Logo" className="w-8 h-8 group-hover:rotate-12 transition-transform duration-500" />
          <span className="font-black uppercase tracking-widest text-xs hidden md:block group-hover:text-amber-600 transition-colors">
            The Iraqi Curator
          </span>
        </Link>
      </div>

      {/* CENTER & RIGHT: Links and Language Toggle */}
      <div className="pointer-events-auto flex items-center gap-8 md:gap-12">
        <div className="flex items-center gap-6 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#111111]">
          <Link href="/museum" className="hover:text-amber-600 transition-colors duration-300 relative group">
            Museum
            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-600 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link href="/blog" className="hover:text-amber-600 transition-colors duration-300 relative group">
            Curations
            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-600 transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </div>

        {/* Language Switcher */}
        <Link 
          href={pathname} 
          locale={nextLocale} 
          className="w-10 h-10 rounded-full border border-zinc-300 flex items-center justify-center text-[10px] font-bold uppercase hover:bg-amber-600 hover:border-amber-600 hover:text-white transition-all duration-300"
        >
          {toggleText}
        </Link>
      </div>
    </motion.nav>
  );
}
