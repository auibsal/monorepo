## 2026-07-23 - Count Query Optimization
**Learning:** For Supabase/PostgREST queries that only return a row count, using .select('*') is inefficient because it parses full row metadata. Use .select('id') to optimize performance.
**Action:** Always use .select('id') instead of .select('*') with { count: 'exact', head: true }.
