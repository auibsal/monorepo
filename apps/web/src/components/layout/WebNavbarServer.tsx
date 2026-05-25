import { getTranslations } from 'next-intl/server';

import WebNavbarClient from './WebNavbarClient';

// 1. Strictly typed locale parameter
export default async function WebNavbarServer({ locale }: { locale: 'en' | 'ar' }) {
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  const targetLocale = locale === 'en' ? 'ar' : 'en';

  // 2. Synchronized with the CI pipeline and Next.js public env standards
  const nexusUrl = process.env.NEXT_PUBLIC_NEXUS_URL || 'http://localhost:3001';

  const resolveHref = (path: string) => {
    if (locale === 'en') return path;
    return path === '/' ? '/ar' : `/ar${path}`;
  };

  const links = [
    { href: resolveHref('/'), label: t('home') },
    { href: resolveHref('/events'), label: t('events') },
    { href: resolveHref('/journal'), label: t('journal') },
  ];

  return (
    <WebNavbarClient
      locale={locale}
      links={links}
      nexusUrl={nexusUrl}
      targetLocale={targetLocale}
      homeUrl={resolveHref('/')}
    />
  );
}
