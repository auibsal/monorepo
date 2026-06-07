import type { MetadataRoute } from 'next';
import { env } from '@auibsal/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_WEB_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // No disallow rules needed: the web platform is 100% public
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
