import type { NextConfig } from "next";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
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
        // CRITICAL: Locks image optimization to your Supabase storage buckets
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      // You can add other specific domains here later (e.g., Google or GitHub avatars)
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
