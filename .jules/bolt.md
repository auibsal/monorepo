## 2026-05-28 - Explicit Supabase Selects
**Learning:** Found that wildcard queries (`.select('*')`) were used in multiple places for list views and cards, leading to unnecessary data fetching and potential performance degradation. Memory indicates that explicit selection prevents payload bloat.
**Action:** Always refactor `.select('*')` to specific column selections (e.g., `.select('id, title_en, starts_at, is_members_only')`) and update TypeScript types using `Pick<Model, 'col1' | 'col2'>` to ensure precise type safety and optimize database query performance.
