import { getTranslations } from 'next-intl/server';

// 1. Synchronized with the named export from the UI package
import { Footer as UIFooter } from '@auibsal/ui/components/layout/Footer';

// 2. Strictly typed locale parameter
export default async function WebFooter({ locale }: { locale: 'en' | 'ar' }) {
  const t = await getTranslations({ locale, namespace: 'Footer' });

  // Resolves the absolute path for the native Next.js Link used in the UI package
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
