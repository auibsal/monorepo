'use client';

import {useLocale} from 'next-intl';
import {usePathname, useRouter} from '@/i18n/routing';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    router.replace(pathname, {locale: nextLocale});
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center px-6 border-l border-white/10 hover:bg-white/5 hover:text-white transition-colors relative group font-mono text-xs uppercase tracking-widest text-white/60"
    >
      {locale === 'en' ? 'عربي' : 'EN'}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
    </button>
  );
};
