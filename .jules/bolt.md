## 2024-07-26 - Optimizing Supabase Count Queries
**Learning:** Selecting '*' for count-only queries causes PostgREST to parse full row metadata and reduces performance due to PostgreSQL index evaluation time.
**Action:** Always use .select('id') instead of .select('*') for count-only queries to optimize performance.
