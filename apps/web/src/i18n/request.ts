import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Enforce strict type-checking against the defined routing configuration
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // Modern Next.js natively traces template literal imports
    messages: (await import(`@auibsal/i18n/messages/${locale}`))[locale as 'en' | 'ar'],
  };
});
