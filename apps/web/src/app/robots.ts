import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Explicitly block crawlers from internal membership and system routes
      disallow: ['/portal/', '/api/', '/login/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
