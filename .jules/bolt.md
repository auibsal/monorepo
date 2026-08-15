## $(date +%Y-%m-%d) - Parallelizing Edge Waterfall Queries
**Learning:** In Next.js applications, consecutive Supabase fetches during dynamic metadata or sitemap generation can cause significant network waterfalls, especially when deployed to Edge or Serverless environments where TTFB (Time to First Byte) is critical.
**Action:** Always inspect SSR and edge routes (like `sitemap.ts` or `page.tsx` serverside components) for independent data fetching operations and aggressively wrap them in `Promise.all()` to maximize concurrency and minimize blocking.
