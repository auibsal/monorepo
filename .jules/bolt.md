## 2026-08-07 - [Concurrent Sitemap Generation]
**Learning:** In Next.js sitemap or metadata generation, making sequential Supabase queries for distinct entities will cause network waterfalls. Always batch independent Supabase database queries using Promise.all() to maximize concurrency and speed up edge responses.
**Action:** Use Promise.all() to concurrently fetch multiple independent collections from Supabase.
