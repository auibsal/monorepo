'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useState, useEffect } from 'react';

export const Navbar = () => {
  const t = useTranslations('Nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Elaborate shrink effect on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-500 border-b border-black/10 ${scrolled ? 'bg-white/90 backdrop-blur-xl py-0 shadow-sm' : 'bg-[#fafafa] py-2'}`}>
      <div className="flex justify-between items-stretch h-20 md:px-12 px-6 max-w-[1600px] mx-auto">
        
        {/* BRANDING */}
        <Link href="/" className="flex items-center gap-6 group py-4">
          {/* Light Mode Domino Logo */}
          <div className="w-12 h-12 bg-[#0a0a0a] flex flex-col justify-between p-1.5 rounded-sm border-2 border-transparent group-hover:border-red-600 group-hover:bg-white transition-all duration-500 shadow-md transform group-hover:rotate-12">
            <div className="w-2.5 h-2.5 bg-white group-hover:bg-black rounded-full transition-colors"></div>
            <div className="w-full h-[2px] bg-white/50 group-hover:bg-black/50"></div>
            <div className="w-2.5 h-2.5 bg-white group-hover:bg-red-600 rounded-full self-end transition-colors"></div>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-black tracking-tighter leading-none text-[#0a0a0a]">I.D.A.</h1>
            <p className="text-[9px] font-mono text-black/50 tracking-[0.3em] mt-1 uppercase">
              {locale === 'ar' ? 'الاتحاد العراقي للدومينو' : 'Iraqi Domino Association'}
            </p>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden md:flex items-stretch font-mono text-xs uppercase tracking-widest text-black/60">
          {['arena', 'registry', 'rulebook', 'engine'].map((key) => (
            <Link key={key} href={`/${key === 'registry' ? 'leaderboard' : key === 'rulebook' ? 'rules' : key}`} className="flex items-center px-8 border-l border-black/10 hover:bg-black/5 hover:text-black transition-colors relative group">
              {t(key)}
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out"></div>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center ml-8 gap-6">
          {/* LANGUAGE SWITCHER */}
          <Link 
            href={pathname} 
            locale={locale === 'en' ? 'ar' : 'en'} 
            className="text-[#0a0a0a] font-mono text-xs font-bold px-4 py-2 border border-black/20 hover:border-black hover:bg-black hover:text-white transition-all"
            dir="ltr"
          >
            {locale === 'en' ? 'عربي' : 'EN'}
          </Link>

          <button className="bg-red-600 text-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#0a0a0a] transition-all duration-500 ease-out shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1">
            {t('portal')}
          </button>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="md:hidden flex items-center gap-4">
           <Link href={pathname} locale={locale === 'en' ? 'ar' : 'en'} className="text-black font-mono text-xs px-2 py-1 border border-black/20">
            {locale === 'en' ? 'AR' : 'EN'}
          </Link>
          <button 
            className="text-black font-mono text-xs uppercase tracking-widest border border-black/20 px-4 py-2 hover:bg-black hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-black/10 font-mono text-sm uppercase tracking-widest flex flex-col absolute w-full h-screen z-40 text-black">
          <Link href="/arena" className="p-6 border-b border-black/10 hover:bg-black/5">{t('arena')}</Link>
          <Link href="/leaderboard" className="p-6 border-b border-black/10 hover:bg-black/5">{t('registry')}</Link>
          <Link href="/rules" className="p-6 border-b border-black/10 hover:bg-black/5">{t('rulebook')}</Link>
          <Link href="/dev" className="p-6 border-b border-black/10 text-red-600 hover:bg-black/5">{t('engine')}</Link>
        </div>
      )}
    </nav>
  );
};
