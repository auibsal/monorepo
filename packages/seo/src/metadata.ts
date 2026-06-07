import type { Metadata } from 'next';
import { env } from '@auibsal/env';

interface MetadataProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

const DEFAULT_TITLE = 'AUIB Society of Arts & Letters';
const DEFAULT_DESCRIPTION = 'The premier platform for literary publication, discourse, and editorial excellence.';
const DEFAULT_IMAGE = 'https://society.idea.inc/og-default.png'; // Will eventually route to your storage bucket
const BASE_URL = env.NEXT_PUBLIC_APP_URL;

/**
 * Constructs a standardized Next.js Metadata object.
 * Automatically injects OpenGraph and Twitter graph objects.
 */
export function constructMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  noIndex = false,
}: MetadataProps = {}): Metadata {
  return {
    title: title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE,
    description,
    openGraph: {
      title: title || DEFAULT_TITLE,
      description,
      images: [{ url: image }],
      type: 'website',
      siteName: DEFAULT_TITLE,
    },
    twitter: {
      card: 'summary_large_image',
      title: title || DEFAULT_TITLE,
      description,
      images: [image],
      creator: '@AUIBSAL', // Borderless, global identifier
    },
    metadataBase: new URL(BASE_URL),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
