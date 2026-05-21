'use client';

import { useSearchParams } from 'next/navigation';

import { usePathname, useRouter } from '@/i18n/routing';

import { Navbar } from '@auibsal/ui';

export default function WebNavbarClient({
  locale,
  links,
  nexusUrl,
  targetLocale,
  homeUrl,
}: {
  locale: string;
  links: { href: string; label: string }[];
  nexusUrl: string;
  targetLocale: string;
  homeUrl: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLanguageToggle = () => {
    // Reconstruct the full URL string to preserve query parameters
    const queryString = searchParams.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    // Explicitly pass scroll: false to prevent the browser from jumping to the top of the page
    router.replace(href as any, { locale: targetLocale, scroll: false });
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
