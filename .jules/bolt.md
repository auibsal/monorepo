## 2026-07-27 - Supabase Count Query Optimization
**Learning:** For Supabase/PostgREST queries that only return a row count (using `{ count: 'exact', head: true }`), using `.select('*')` forces full row parsing. Using `.select('id')` optimizes performance by reducing PostgreSQL index evaluation time and preventing PostgREST from parsing full row metadata.
**Action:** Always use `.select('id')` instead of `.select('*')` for count-only Supabase queries.
