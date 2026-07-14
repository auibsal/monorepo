## 2024-07-14 - Optimize Supabase Count Queries
**Learning:** For Supabase/PostgREST queries that only return a row count, using `.select('*')` forces PostgREST to parse full row metadata and causes slow index evaluation.
**Action:** Always use `.select('id')` instead of `.select('*')` for count-only queries.
