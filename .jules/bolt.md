## 2024-05-25 - Prevented Over-fetching from Supabase Database
**Learning:** Found an anti-pattern in list views where `.select('*')` is used instead of selecting explicit columns, leading to fetching all columns of every row. This causes excessive payload bloating in list endpoints (like admin logs and users pages).
**Action:** Replace `.select('*')` queries in lists/cards with explicitly specified columns (`.select('id, col1, col2')`). Ensure TypeScript state types strictly mirror these subset fetches using `Pick<Tables<'table'>, 'col1' | 'col2'>` to prevent runtime rendering bugs.
