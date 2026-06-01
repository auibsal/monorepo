/**
 * BUCKETS
 *
 * @description Standardized execution for BUCKETS.
 */
export const BUCKETS = {
  // Requires Row Level Security (RLS) and signed URLs to access
  MANUSCRIPTS: 'manuscripts',
  
  // Open read access for the Next.js `<Image />` component
  ASSETS: 'assets',
} as const;
