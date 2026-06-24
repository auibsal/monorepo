## 2024-05-24 - [Concurrent Supabase Data Fetching]
**Learning:** When generating a sitemap or loading a page with multiple distinct datasets from Supabase, sequential await calls cause network waterfalls, negatively impacting performance.
**Action:** Use Promise.all to fetch distinct datasets concurrently.
