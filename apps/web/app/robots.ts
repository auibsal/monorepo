import { project } from "@repo/config";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      // Google Wallet reaches the pass images and the save/remove callback
      // as Googlebot (/api/wallet/...); the rest of the API stays out.
      allow: ["/", "/api/wallet/"],
      disallow: ["/api/"],
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", project.url).href,
  };
}
