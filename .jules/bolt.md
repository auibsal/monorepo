## 2024-06-25 - Prevent Data Overfetching

**Learning:** When querying Supabase for list views or cards, explicitly specify only the required columns (e.g., `select('id, title, status')`) instead of `select('*')` to prevent payload bloat from over-fetching large text or file fields. This codebase previously had over-fetching issues in blog posts which were fixed, but the pattern remains in several other list pages.
**Action:** Replace `select('*')` with explicit field lists in list/index pages.
