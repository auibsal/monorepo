## 2024-07-15 - Optimize count queries in PostgREST
**Learning:** For Supabase/PostgREST queries that only return a row count (using `{ count: 'exact', head: true }`), using `.select('*')` is inefficient because it requires PostgreSQL to evaluate the full row and PostgREST to parse full row metadata, even though no data is returned.
**Action:** Always use `.select('id', { count: 'exact', head: true })` instead of `.select('*')` to optimize performance by reducing PostgreSQL index evaluation time and preventing PostgREST from parsing full row metadata.
