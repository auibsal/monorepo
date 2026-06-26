## 2024-05-15 - Concurrent Queries
**Learning:** Found sequential independent DB queries in `sitemap.ts` causing network waterfall.
**Action:** Use `Promise.all` to execute distinct and independent dataset queries concurrently as per memory instructions.
