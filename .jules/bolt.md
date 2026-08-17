## 2026-08-17 - Prevent Sequential DB Queries in Next.js Server Components
**Learning:** Sequential Supabase queries for distinct entities cause network waterfalls, increasing edge response times.
**Action:** Always batch independent Supabase queries using Promise.all() to maximize concurrency and speed up edge responses.
