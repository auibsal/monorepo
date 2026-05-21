## 2024-05-24 - Database Optimization: Prevent Over-fetching Large Text Columns

**Learning:** Using `select('*')` on list views and tables like `users` (which has a `biography` column) or `events` (which has `description_en` and `description_ar` columns) leads to significant payload bloat and wasted network/memory resources, especially since these fields are only needed in detailed views.
**Action:** Always explicitly specify required columns (e.g., `select('id, full_name, university_id, role')`) when querying Supabase for list views or data tables, rather than using `select('*')`.
