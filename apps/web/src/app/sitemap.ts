import { MetadataRoute } from 'next';

import { createClient } from '@auibsal/auth/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org';
  const supabase = await createClient();

  const staticPaths = ['', '/about', '/events', '/journal', '/blog'];

  // 1. Corrected Static Routes
  const sitemapEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    alternates: {
      languages: {
        en: `${baseUrl}${path}`, // English is at the root
        ar: `${baseUrl}/ar${path}`, // Arabic has the prefix
      },
    },
  }));

  // Fetch dynamic journal issues
  const { data: issues } = await supabase
    .from('journal_issues')
    .select('id, published_at')
    .not('published_at', 'is', null);

  if (issues) {
    issues.forEach((issue) => {
      sitemapEntries.push({
        url: `${baseUrl}/journal/${issue.id}`,
        lastModified: new Date(issue.published_at || new Date()),
        alternates: {
          languages: {
            en: `${baseUrl}/journal/${issue.id}`,
            ar: `${baseUrl}/ar/journal/${issue.id}`,
          },
        },
      });
    });
  }

  // Fetch dynamic blog posts
  const { data: posts } = await supabase.from('blog_posts').select('slug, published_at');

  if (posts) {
    posts.forEach((post) => {
      sitemapEntries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.published_at || new Date()),
        alternates: {
          languages: {
            en: `${baseUrl}/blog/${post.slug}`,
            ar: `${baseUrl}/ar/blog/${post.slug}`,
          },
        },
      });
    });
  }

  // Fetch dynamic submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, submitted_at')
    .in('status', ['public', 'accepted']);

  if (submissions) {
    submissions.forEach((sub) => {
      sitemapEntries.push({
        url: `${baseUrl}/submissions/${sub.id}`,
        lastModified: new Date(sub.submitted_at || new Date()),
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
