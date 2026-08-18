## 2026-08-18 - Prevent Next.js Sitemap Network Waterfalls
**Learning:** In Next.js sitemap or metadata generation, making sequential Supabase queries for distinct entities causes network waterfalls.
**Action:** Always batch independent Supabase database queries using `Promise.all()` to maximize concurrency and speed up edge responses.
