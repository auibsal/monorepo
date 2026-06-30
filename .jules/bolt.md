## 2024-06-30 - Optimize Sequential Supabase Queries
**Learning:** Sequential Supabase queries in Server Components or API routes (like sitemap generation) create network waterfalls, delaying responses unnecessarily.
**Action:** When querying Supabase for multiple distinct, independent datasets, wrap the queries in a `Promise.all` block to execute them concurrently, eliminating network waterfalls and improving load performance.
