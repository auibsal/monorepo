import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Logo from '@/components/Logo';

export default async function Navbar({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  const targetLocale = locale === 'en' ? 'ar' : 'en';

  return (
    <nav className="sticky top-0 z-50 w-full bg-auib-white/95 backdrop-blur-sm border-b border-auib-charcoal/10">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        
        <Link href="/" className="flex items-center">
          <Logo locale={locale} className="text-xs sm:text-sm leading-tight" />
        </Link>

        <div className="flex items-center gap-8">
          <ul className="flex items-center gap-6 font-medium text-sm text-auib-charcoal">
            {/* Clean paths, no manual locale prefixing needed */}
            <li><Link href="/" className="hover:text-auib-red transition-colors">{t('home')}</Link></li>
            <li><Link href="/events" className="hover:text-auib-red transition-colors">{t('events')}</Link></li>
            <li><Link href="/journal" className="hover:text-auib-red transition-colors">{t('journal')}</Link></li>
          </ul>

          <div className="h-6 w-px bg-auib-charcoal/20"></div>

          {/* Switch language, default back to root path */}
          <Link 
            href="/" 
            locale={targetLocale}
            className="text-sm font-bold text-auib-red hover:text-auib-charcoal transition-colors uppercase tracking-widest"
          >
            {targetLocale}
          </Link>
        </div>
      </div>
    </nav>
  );
}
