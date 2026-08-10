import { createClient } from '@auibsal/auth/server';
import type { MetadataRoute } from 'next';
import { env } from '@auibsal/env';

/**
 * The revalidation period for ISR (Incremental Static Regeneration).
 * Prevents Next.js from crashing at build-time due to cookie access,
 * while ensuring the sitemap is cached and regenerated every hour.
 */
export const revalidate = 3600;

/**
 * Generates the dynamic sitemap for the application.
 * Merges static routes with dynamic entities like journal issues, blog posts, and submissions.
 *
 * @returns {Promise<MetadataRoute.Sitemap>} The fully generated sitemap structure.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_WEB_URL;

  const supabase = await createClient();

  const staticPaths = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/events', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/journal', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  ] as const;

  const sitemapEntries: MetadataRoute.Sitemap = staticPaths.map((item) => ({
    url: `${baseUrl}${item.path}`,
    lastModified: new Date(),
    changeFrequency: item.changeFrequency,
    priority: item.priority,
    alternates: {
      languages: {
        en: `${baseUrl}${item.path}`,
        ar: `${baseUrl}/ar${item.path}`,
      },
    },
  }));

  // ⚡ Bolt Optimization: Batch sequential database queries concurrently
  // Using Promise.all reduces network waterfalls and speeds up edge generation.
  const [{ data: issues }, { data: posts }, { data: submissions }] = await Promise.all([
    supabase
      .from('journal_issues')
      .select('id, published_at')
      .not('published_at', 'is', null),
    supabase.from('blog_posts').select('slug, published_at'),
    supabase
      .from('submissions')
      .select('id, submitted_at')
      .in('status', ['accepted']),
  ]);

  if (issues) {
    issues.forEach((issue) => {
      sitemapEntries.push({
        url: `${baseUrl}/journal/${issue.id}`,
        lastModified: new Date(issue.published_at || new Date()),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: {
            en: `${baseUrl}/journal/${issue.id}`,
            ar: `${baseUrl}/ar/journal/${issue.id}`,
          },
        },
      });
    });
  }

  if (posts) {
    posts.forEach((post) => {
      sitemapEntries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.published_at || new Date()),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: {
            en: `${baseUrl}/blog/${post.slug}`,
            ar: `${baseUrl}/ar/blog/${post.slug}`,
          },
        },
      });
    });
  }

  if (submissions) {
    submissions.forEach((sub) => {
      sitemapEntries.push({
        url: `${baseUrl}/submissions/${sub.id}`,
        lastModified: new Date(sub.submitted_at || new Date()),
        changeFrequency: 'yearly',
        priority: 0.5,
        alternates: {
          languages: {
            en: `${baseUrl}/submissions/${sub.id}`,
            ar: `${baseUrl}/ar/submissions/${sub.id}`,
          },
        },
      });
    });
  }

  return sitemapEntries;
}
