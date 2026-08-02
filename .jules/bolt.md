## 2026-08-02 - Prevent Network Waterfalls in Next.js Sitemap
**Learning:** Sequential Supabase queries in Next.js sitemap or metadata generation cause network waterfalls, delaying edge responses.
**Action:** Always batch independent Supabase database queries using `Promise.all()` to maximize concurrency and speed up edge generation.
