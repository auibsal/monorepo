import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/supabase"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Update this to your specific Supabase storage URL later for security
      },
    ],
  },
};

export default withNextIntl(nextConfig);
