import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/supabase"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", 
      },
    ],
  },
};

export default nextConfig;
