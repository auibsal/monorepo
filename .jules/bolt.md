## 2024-07-20 - Optimize PostgREST Count Queries
**Learning:** Using `.select('*')` with `{ count: 'exact', head: true }` causes PostgREST to parse full row metadata even though only the count is returned, which is a performance bottleneck.
**Action:** Always use `.select('id')` instead of `.select('*')` for Supabase/PostgREST queries that only return a row count to optimize performance.
