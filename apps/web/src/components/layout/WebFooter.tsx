import { getTranslations } from 'next-intl/server';

import { Footer as UIFooter } from '@auibsal/ui';

export default async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Footer' });

  const resolveHref = (path: string) => {
    if (locale === 'en') return path;
    return path === '/' ? '/ar' : `/ar${path}`;
  };

  const dictionary = {
    description: t('description'),
    linksTitle: t('linksTitle'),
    links: [
      { href: resolveHref('/'), label: t('home') },
      { href: resolveHref('/events'), label: t('events') },
      { href: resolveHref('/journal'), label: t('journal') },
    ],
    contactTitle: t('contactTitle'),
    university: t('university'),
    addressLine1: t('addressLine1'),
    addressLine2: t('addressLine2'),
    societyName: t('societyName'),
    rights: t('rights'),
    designedBy: t('designedBy'),
  };

  return <UIFooter locale={locale} dictionary={dictionary} />;
}
