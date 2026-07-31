## 2026-07-31 - [Batch Sitemap Database Queries]
**Learning:** Next.js sitemap generation can cause network waterfalls when making sequential database queries for distinct entities (like posts, issues, submissions). Supabase JS client requests are distinct promises that block subsequent fetches if awaited separately.
**Action:** Always batch independent Supabase queries in sitemap/metadata generation using `Promise.all()` to maximize concurrency and speed up the edge response.
