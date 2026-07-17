## 2026-07-17 - Supabase Count Query Optimization
**Learning:** Using `.select('*')` with `{ count: 'exact', head: true }` in Supabase causes PostgREST to parse full row metadata and increases PostgreSQL index evaluation time, slowing down count-only queries.
**Action:** Always use `.select('id')` instead of `.select('*')` for count-only Supabase queries.
