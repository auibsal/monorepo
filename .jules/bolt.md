## 2024-05-24 - Batching sequential database queries in Next.js Server Components
**Learning:** Sequential Supabase queries in Next.js server components (like sitemap generation) cause unnecessary network waterfalls. Wrapping them in Promise.all executes them concurrently, significantly reducing TTFB (Time to First Byte).
**Action:** Always look for independent data requirements in a route and batch them using Promise.all.
