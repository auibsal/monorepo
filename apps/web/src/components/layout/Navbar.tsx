'use client';

import { motion } from 'framer-motion';
import { Link, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useState } from 'react';

export function Navbar() {
  const locale = useLocale();
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);
  
  const nextLocale = locale === 'en' ? 'ar' : 'en';
  const toggleText = locale === 'en' ? 'عربي' : 'ENG';

  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 w-full z-40 px-6 md:px-12 py-6 flex items-center justify-between pointer-events-none mix-blend-difference text-white"
    >
      {/* LEFT: Logo / Home Link */}
      <div className="pointer-events-auto">
        <Link href="/" className="group flex items-center gap-3">
          {!imgError && (
            <img 
              src="/logo-samoon.png" 
              alt="TIC" 
              onError={() => setImgError(true)}
              className="w-8 h-8 group-hover:rotate-12 transition-transform duration-500" 
            />
          )}
          <span className="font-black uppercase tracking-widest text-xs group-hover:text-amber-500 transition-colors">
            TIC.
          </span>
        </Link>
      </div>

      {/* CENTER & RIGHT: Links and Language Toggle */}
      <div className="pointer-events-auto flex items-center gap-4 md:gap-8">
        <div className="flex items-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">
          <Link href="/museum" className="hover:text-amber-500 transition-colors duration-300 relative group hidden sm:block">
            Museum
          </Link>
          <Link href="/blog" className="hover:text-amber-500 transition-colors duration-300 relative group hidden sm:block">
            Curations
          </Link>
        </div>

        {/* Language Switcher */}
        <Link 
          href={pathname} 
          locale={nextLocale} 
          className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-current flex items-center justify-center text-[9px] md:text-[10px] font-bold uppercase hover:bg-amber-500 hover:border-amber-500 hover:text-black transition-all duration-300"
        >
          {toggleText}
        </Link>
      </div>
    </motion.nav>
  );
}
