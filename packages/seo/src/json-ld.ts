/**
 * Generates Google-compliant JSON-LD structured data for a published manuscript.
 * This should be injected into the <head> of a reading page.
 */
export function generateArticleSchema({
  title,
  authorName,
  publishedAt,
  url,
}: {
  title: string;
  authorName: string;
  publishedAt: string; // ISO 8601 Date
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AUIB Society of Arts & Letters',
    },
    datePublished: publishedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}
