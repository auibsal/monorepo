## 2024-05-18 - Optimize list view payload fetching
**Learning:** Explicitly selecting columns in list views (e.g., .select('id, full_name, role')) prevents payload bloat from over-fetching unused text or JSON fields like `calendar_token`, `biography`, and `avatar_url`.
**Action:** Use Pick<User, 'id' | 'full_name'> to type narrowed responses strictly to their generated schema.
