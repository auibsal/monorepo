import { getTranslations } from 'next-intl/server';
import WebNavbarClient from './WebNavbarClient';

export default async function WebNavbarServer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Navigation' });
  const targetLocale = locale === 'en' ? 'ar' : 'en';

  const nexusUrl = process.env.NEXUS_URL || 'http://localhost:3001';

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
