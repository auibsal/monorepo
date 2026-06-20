## 2025-06-20 - Promise.all prevents Supabase Network Waterfalls
**Learning:** Sequential Supabase queries block rendering and sitemap generation, creating network waterfalls.
**Action:** Always wrap distinct, independent datasets fetched from Supabase within the same component/route into a `Promise.all` block to execute them concurrently.
