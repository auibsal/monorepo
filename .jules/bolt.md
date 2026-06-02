## 2024-06-02 - Supabase Payload Bloat Optimization
**Learning:** Using `select('*')` on Supabase queries can drastically inflate the JSON payload by fetching unnecessary columns (especially large text blocks or relational data), leading to slower network parsing and increased memory consumption in client applications.
**Action:** Always map queried columns explicitly (e.g., `.select('id, title, status')`) and utilize strict TypeScript mappings using `Pick<Tables<'table_name'>, 'id' | 'title' | 'status'>` to guarantee type safety aligned with the narrowed Supabase payload.
