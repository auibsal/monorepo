import { MetadataRoute } from 'next';
import { createClient } from 'auth/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org';
  const supabase = await createClient();

  const staticPaths = [
    '',
    '/about',
    '/events',
    '/journal',
    '/blog'
  ];

  const sitemapEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    alternates: {
      languages: {
        en: `${baseUrl}/en${path}`,
        ar: `${baseUrl}/ar${path}`,
      },
    },
  }));

  // Fetch dynamic journal issues
  // The prompt explicitly requested: "where the status is explicitly set to public/accepted"
  const { data: issues } = await supabase
    .from('journal_issues')
    .select('id, published_at')
    // @ts-ignore - The prompt implies a status column exists for filtering
    .in('status', ['public', 'accepted']);

  if (issues) {
    issues.forEach((issue) => {
      sitemapEntries.push({
        url: `${baseUrl}/journal/${issue.id}`,
        lastModified: new Date(issue.published_at || new Date()),
        alternates: {
          languages: {
            en: `${baseUrl}/en/journal/${issue.id}`,
            ar: `${baseUrl}/ar/journal/${issue.id}`,
          },
        },
      });
    });
  }

  // Fetch dynamic blog posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, published_at');

  if (posts) {
    posts.forEach((post) => {
      sitemapEntries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.published_at || new Date()),
        alternates: {
          languages: {
            en: `${baseUrl}/en/blog/${post.slug}`,
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
        url: `${baseUrl}/submissions/${sub.id}`, // Using a logical path
        lastModified: new Date(sub.submitted_at || new Date()),
        alternates: {
          languages: {
            en: `${baseUrl}/en/submissions/${sub.id}`,
            ar: `${baseUrl}/ar/submissions/${sub.id}`,
          },
        },
      });
    });
  }

  return sitemapEntries;
}
