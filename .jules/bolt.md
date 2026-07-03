## 2026-07-03 - Concurrent Supabase Fetching
**Learning:** The application queries Supabase sequentially in some areas like the editorial submission page, causing a network waterfall.
**Action:** When querying Supabase for multiple distinct, independent datasets within a component or route, wrap the queries in a `Promise.all` block to execute them concurrently, eliminating network waterfalls and improving component load performance.
