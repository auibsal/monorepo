import { MetadataRoute } from 'next';

import { createClient } from '@auibsal/auth/server';

// =========================================================================
// Incremental Static Regeneration (ISR)
// =========================================================================
// Prevents Next.js from crashing at build-time due to cookie access,
// while ensuring the sitemap is cached and regenerated every hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org';

  // Safe to call here now because of the revalidate/dynamic export
  const supabase = await createClient();

  const staticPaths = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/events', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/journal', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  ] as const;

  // 1. Core Static Routes
  const sitemapEntries: MetadataRoute.Sitemap = staticPaths.map((item) => ({
    url: `${baseUrl}${item.path}`,
    lastModified: new Date(),
    changeFrequency: item.changeFrequency,
    priority: item.priority,
    alternates: {
      languages: {
        en: `${baseUrl}${item.path}`, // English is at the root
        ar: `${baseUrl}/ar${item.path}`, // Arabic has the prefix
      },
    },
  }));

  // =========================================================================
  // Dynamic Content Fetching
  // =========================================================================

  // 2. Fetch dynamic journal issues
  const { data: issues } = await supabase
    .from('journal_issues')
    .select('id, published_at')
    .not('published_at', 'is', null);

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

  // 3. Fetch dynamic blog posts
  const { data: posts } = await supabase.from('blog_posts').select('slug, published_at');

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

  // 4. Fetch dynamic submissions (if publicly visible)
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, submitted_at')
    .in('status', ['accepted']);

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
