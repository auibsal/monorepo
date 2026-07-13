## 2024-07-13 - Optimize Supabase count queries
**Learning:** For Supabase/PostgREST queries that only return a row count (using `{ count: 'exact', head: true }`), using `.select('*')` forces PostgREST to parse full row metadata which adds overhead.
**Action:** Always use `.select('id')` instead of `.select('*')` for count queries to optimize performance by reducing PostgreSQL index evaluation time and preventing PostgREST from parsing full row metadata.
