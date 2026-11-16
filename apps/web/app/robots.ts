import { project } from "@repo/config";
import type { MetadataRoute } from "next";

/**
 * robots.txt: search engines keep the site, all but the API. The AI
 * crawlers (decisions.md, The site: "AI crawlers are blocked") are
 * Cloudflare's: its managed robots.txt puts their Disallow lines before
 * these, and "Block AI bots" enforces them at the edge (docs/platform/
 * settings.md, Cloudflare).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Google Wallet reaches the pass images and the save/remove
        // callback as Googlebot (/api/wallet/...); the rest of the API
        // stays out.
        allow: ["/", "/api/wallet/"],
        disallow: ["/api/"],
        userAgent: "*",
      },
    ],
    sitemap: new URL("/sitemap.xml", project.url).href,
  };
}
