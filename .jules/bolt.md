## 2024-05-18 - Next.js Sitemap Query Batching
**Learning:** Sequential Supabase queries for distinct entities in Next.js sitemaps cause unnecessary network waterfalls, significantly slowing down edge responses.
**Action:** Always batch independent Supabase database queries using Promise.all() to maximize concurrency and speed up generation.
