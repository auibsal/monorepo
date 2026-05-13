import { getTranslations } from 'next-intl/server';
import { Navbar } from 'ui';
import Link from 'next/link';

import { headers } from 'next/headers';

export default async function WebNavbar({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  const targetLocale = locale === 'en' ? 'ar' : 'en';

  const headersList = await headers();
  const host = headersList.get('host') || '';

  let nexusUrl = 'http://localhost:3001';
  if (process.env.NODE_ENV !== 'development') {
    // Determine dynamically by prepending 'nexus.' and removing 'www.'
    const domain = host.replace(/^www\./, '');
    nexusUrl = `https://nexus.${domain}`;
  }

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
      <a
        href={nexusUrl}
        className="text-sm font-bold text-auib-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
      >
        Nexus
      </a>
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
