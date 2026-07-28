## 2026-07-28 - Optimize Supabase Count Queries
**Learning:** Using .select('*') with { count: 'exact', head: true } causes PostgREST to parse full row metadata even though only the count is needed, leading to performance degradation.
**Action:** Always use .select('id') instead of .select('*') for count-only queries to reduce PostgreSQL index evaluation time and prevent unnecessary metadata parsing.
