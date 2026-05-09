import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as "en" | "ar")) {
    locale = routing.defaultLocale;
  }

  // Explicitly import to fix Vercel Serverless file tracing
  const messages = locale === 'ar' 
    ? (await import('../../messages/ar.json')).default
    : (await import('../../messages/en.json')).default;

  return {
    locale,
    messages
  };
});
