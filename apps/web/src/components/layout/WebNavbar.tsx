import { getTranslations } from 'next-intl/server';
import { Navbar } from 'ui';
import Link from 'next/link';

export default async function WebNavbar({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  const targetLocale = locale === 'en' ? 'ar' : 'en';

  const links = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/events`, label: t('events') },
    { href: `/${locale}/journal`, label: t('journal') },
  ];

  const rightModule = (
    <>
      <Link
        href={`/${targetLocale}`}
        className="text-sm font-bold text-auib-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
      >
        {targetLocale === 'en' ? 'English' : 'عربي'}
      </Link>
      <div className="h-6 w-1 bg-auib-white/30 hidden md:block"></div>
      <Link
        href="/dashboard"
        className="text-sm font-bold text-auib-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
      >
        Account
      </Link>
    </>
  );

  return (
    <Navbar
      locale={locale}
      links={links}
      rightModule={rightModule}
      homeUrl={`/${locale}`}
    />
  );
}
