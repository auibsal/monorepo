## 2026-06-17 - Server Component Network Waterfall Optimization
**Learning:** Next.js Server Components, like `sitemap.ts`, can suffer from silent network waterfalls when awaiting multiple distinct, independent Supabase datasets sequentially, significantly delaying TTFB (Time to First Byte).
**Action:** Always wrap independent Supabase data fetches in Next.js Server Components using `Promise.all()` to fetch them concurrently, eliminating waterfalls.
