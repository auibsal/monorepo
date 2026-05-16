'use client';

import { Navbar } from '@auibsal/ui';
import { useRouter, usePathname } from '@/i18n/routing';

export default function WebNavbarClient({
  locale,
  links,
  nexusUrl,
  targetLocale,
  homeUrl
}: {
  locale: string;
  links: { href: string; label: string }[];
  nexusUrl: string;
  targetLocale: string;
  homeUrl: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageToggle = () => {
    router.replace(pathname, { locale: targetLocale });
  };

  return (
    <Navbar
      locale={locale}
      links={links}
      homeUrl={homeUrl}
      platform="web"
      targetLocale={targetLocale}
      nexusUrl={nexusUrl}
      onLanguageToggle={handleLanguageToggle}
    />
  );
}
