## 2026-07-16 - Optimize Supabase Count Queries
**Learning:** For Supabase/PostgREST queries that only return a row count, using `.select('*')` forces full row metadata parsing and index evaluation overhead.
**Action:** Always use `.select('id')` instead of `.select('*')` when using `{ count: 'exact', head: true }` to optimize PostgreSQL index evaluation time and reduce parsing overhead.
