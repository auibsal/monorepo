## 2026-07-22 - [Supabase Query Optimization]
**Learning:** [For Supabase/PostgREST queries that only return a row count (using { count: 'exact', head: true }), always use .select('id') instead of .select('*') to optimize performance by reducing PostgreSQL index evaluation time and preventing PostgREST from parsing full row metadata.]
**Action:** [Use .select('id') for count queries]
