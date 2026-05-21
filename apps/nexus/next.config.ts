import type { NextConfig } from "next";

// ⚡ Bolt Security Optimization: Dynamically evaluate the environment
const isDev = process.env.NODE_ENV !== 'production';

const cspHeader = `
    default-src 'self';
    /* CRITICAL FIX: Strip unsafe-eval in production to kill XSS vectors */
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    connect-src 'self' *.supabase.co;
    img-src 'self' data: blob: *.supabase.co;
    frame-src 'self' *.supabase.co;
`.replace(/\n/g, '').replace(/\s+/g, ' ').trim();

const nextConfig: NextConfig = {
  transpilePackages: ["@auibsal/auth", "@auibsal/database", "@auibsal/ui"],
  serverExternalPackages: ["node-ical"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Locks image optimization to your Supabase storage buckets
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
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
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
