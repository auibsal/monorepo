## 2026-07-19 - Supabase Count Query Optimization
**Learning:** For Supabase/PostgREST queries that only return a row count (using `{ count: 'exact', head: true }`), using `.select('*')` causes unnecessary PostgreSQL index evaluation and PostgREST metadata parsing.
**Action:** Always use `.select('id')` instead of `.select('*')` to optimize performance when only a count is needed.
