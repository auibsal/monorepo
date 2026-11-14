import { project } from "@repo/config";
import type { MetadataRoute } from "next";

/**
 * The AI training crawlers (decisions.md, The site: "AI crawlers are
 * blocked"), disallowed site-wide so Qirtas's pieces stay out of AI
 * training, as their licenses intend. Search engines are unaffected;
 * Cloudflare's "Block AI bots" does the same at the edge.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "CCBot",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot-Extended",
  "Bytespider",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "Amazonbot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
  "Timpibot",
  "YouBot",
  "AI2Bot",
  "Ai2Bot-Dolma",
] as const;

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
      { disallow: ["/"], userAgent: [...AI_CRAWLERS] },
    ],
    sitemap: new URL("/sitemap.xml", project.url).href,
  };
}
