## 2024-06-09 - Supabase Select Optimization
**Learning:** Using `.select('*')` in Supabase queries for list views causes unnecessary payload bloat, especially when only a few columns are rendered in the UI.
**Action:** When querying Supabase for list views or cards, explicitly specify only the required columns (e.g., `select('id, title, status')`) to prevent over-fetching. For TypeScript typing, strictly use `Pick<Tables<'table_name'>, 'col1' | 'col2'>` to map the result to the generated schema.
