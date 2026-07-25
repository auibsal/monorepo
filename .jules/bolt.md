## 2026-07-25 - Optimize Supabase Count Queries
**Learning:** Using .select('*') with { count: 'exact', head: true } in Supabase causes PostgREST and PostgreSQL to evaluate full row metadata, creating unnecessary database overhead for simple count queries.
**Action:** Always use .select('id') when performing count-only queries to improve database performance.
