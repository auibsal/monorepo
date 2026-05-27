import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // No disallow rules needed: the web platform is 100% public
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
