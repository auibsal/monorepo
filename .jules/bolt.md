## 2024-05-24 - Optimize Supabase Count Queries
**Learning:** Use .select('id') instead of .select('*') for head queries to reduce index evaluation and metadata parsing overhead.
**Action:** Always use .select('id') for count-only queries.
