## 2026-07-21 - Optimize Supabase Count Queries
**Learning:** Supabase queries returning only row counts (using `{ count: 'exact', head: true }`) should use `.select('id')` instead of `.select('*')` to optimize performance. It prevents PostgREST from parsing full row metadata and reduces PostgreSQL index evaluation time.
**Action:** Use `.select('id', { count: 'exact', head: true })` for all count-only queries.
