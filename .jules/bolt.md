## 2024-05-18 - Explicit Column Selection in Public List Views
**Learning:** Next.js SSR list views (like `/events` and `/journal`) using Supabase `.select('*')` over-fetch unused columns, bloating payload size and memory.
**Action:** Always explicitly specify required columns (e.g., `.select('id, title_en, title_ar')`) in `.select()` for public list views.
