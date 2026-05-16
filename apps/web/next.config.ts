import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["auth", "database", "ui"],
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
};

export default withNextIntl(nextConfig);
