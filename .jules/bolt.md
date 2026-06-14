## 2025-06-14 - Replace Sequential Supabase Queries with Promise.all
**Learning:** Sequential `await supabase...` queries in Next.js/React components (e.g. `await supabase.from('submissions')` followed by `await supabase.from('users')`) cause an unnecessary network waterfall, resulting in slower component loading.
**Action:** When a component requires multiple distinct data sets from Supabase that don't depend on each other, wrap them in a `Promise.all` block to execute them concurrently and improve performance.
