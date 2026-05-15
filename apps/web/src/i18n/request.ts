import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as "en" | "ar")) {
    locale = routing.defaultLocale;
  }

  // Explicitly import to fix Vercel Serverless file tracing
  let messages;
  switch (locale) {
    case 'ar':
      messages = (await import('../../messages/ar.json')).default;
      break;
    case 'en':
    default:
      messages = (await import('../../messages/en.json')).default;
      break;
  }

  return {
    locale,
    messages
  };
});
