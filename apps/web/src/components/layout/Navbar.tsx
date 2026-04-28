'use client';

import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';

export const Navbar = () => {
  const t = useTranslations('Navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    // Replace the current URL with the new language prefix
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header className="fixed top-0 w-full z-50 mix-blend-difference text-zinc-50 pointer-events-none">
      <nav className="flex justify-between items-center p-8 md:px-12 pointer-events-auto">
        {/* Brand */}
        <Link href="/" className="text-sm font-black tracking-widest uppercase hover:text-amber-500 transition-colors">
          TIC.
        </Link>

        {/* Links */}
        <div className="flex items-center gap-8">
          <Link href="/museum" className="text-xs uppercase tracking-[0.2em] hover:text-amber-500 transition-colors">
            {t('museum')}
          </Link>
          <Link href="/blog" className="text-xs uppercase tracking-[0.2em] hover:text-amber-500 transition-colors">
            {t('blog')}
          </Link>
          
          {/* Language Switcher */}
          <button 
            onClick={toggleLanguage}
            className="text-xs font-serif italic text-amber-500 hover:text-amber-400 ml-4 border border-amber-500/30 px-3 py-1 rounded-none"
          >
            {t('switch_lang')}
          </button>
        </div>
      </nav>
    </header>
  );
};
