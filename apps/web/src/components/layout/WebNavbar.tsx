import { getTranslations } from 'next-intl/server';
import { Navbar } from 'ui';
import Link from 'next/link';

export default async function WebNavbar({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  const targetLocale = locale === 'en' ? 'ar' : 'en';

  // CRITICAL: Pull external service URLs from the environment, not the Host header
  const nexusUrl = process.env.NEXUS_URL || 'http://localhost:3001';

  // Safely resolve routes to respect the 'as-needed' next-intl configuration
  // This prevents the shared UI package from being polluted with next-intl logic.
  const resolveHref = (path: string) => {
    if (locale === 'en') return path;
    return path === '/' ? '/ar' : `/ar${path}`;
  };

  const links = [
    { href: resolveHref('/'), label: t('home') },
    { href: resolveHref('/events'), label: t('events') },
    { href: resolveHref('/journal'), label: t('journal') },
  ];

  const rightModule = (
    <>
      <Link
        href={targetLocale === 'en' ? '/' : '/ar'}
        className="text-sm font-bold text-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
      >
        {targetLocale === 'en' ? 'English' : 'عربي'}
      </Link>
      <div className="h-6 w-1 bg-white/30 hidden md:block"></div>
      <a
        href={nexusUrl}
        className="text-sm font-bold text-white hover:text-auib-charcoal transition-colors uppercase tracking-widest"
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
      homeUrl={resolveHref('/')}
    />
  );
}
