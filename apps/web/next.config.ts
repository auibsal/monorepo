import type { NextConfig } from 'next';

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Dynamic CSP Generator based on the environment
const generateCsp = () => {
  const isDev = process.env.NODE_ENV === 'development';

  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    connect-src 'self' *.supabase.co;
    img-src 'self' data: blob: *.supabase.co;
    frame-src 'self' *.supabase.co;
  `
    .replace(/\n/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const nextConfig: NextConfig = {
  transpilePackages: ['@auibsal/auth', '@auibsal/database', '@auibsal/ui'],

  // =========================================================================
  // Monorepo CI Optimization
  // =========================================================================
  // Turborepo handles linting and typechecking in parallel tasks.
  // We disable them here to prevent Next.js from doubling the build time.
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Locks image optimization to your Supabase storage buckets
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            // Execute the generator at build/request time
            value: generateCsp(),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
