import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function Navbar({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  const targetLocale = locale === 'en' ? 'ar' : 'en';

  return (
    <nav className="sticky top-0 z-50 w-full bg-auib-white/95 backdrop-blur-sm border-b border-auib-charcoal/10">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <div className="w-12 h-12 bg-auib-red text-auib-white flex items-center justify-center font-bold font-serif shadow-sm">
            SAL
          </div>
          <span className="font-bold text-auib-charcoal tracking-wide hidden sm:block">
            {t('societyName')}
          </span>
        </Link>

        <div className="flex items-center gap-8">
          <ul className="flex items-center gap-6 font-medium text-sm text-auib-charcoal">
            <li><Link href={`/${locale}`} className="hover:text-auib-red transition-colors">{t('home')}</Link></li>
            <li><Link href={`/${locale}/events`} className="hover:text-auib-red transition-colors">{t('events')}</Link></li>
            <li><Link href={`/${locale}/journal`} className="hover:text-auib-red transition-colors">{t('journal')}</Link></li>
          </ul>
          <div className="h-6 w-px bg-auib-charcoal/20"></div>
          <Link href={`/${targetLocale}`} className="text-sm font-bold text-auib-red hover:text-auib-charcoal transition-colors uppercase tracking-widest">
            {targetLocale}
          </Link>
        </div>
      </div>
    </nav>
  );
}
