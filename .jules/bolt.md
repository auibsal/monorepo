## 2024-07-08 - Supabase Query Batching via Promise.all
**Learning:** Supabase JavaScript client returns `{ data, error }` instead of throwing natively. However, they are still asynchronous operations that block if awaited sequentially.
**Action:** When querying multiple distinct, independent datasets (e.g., entity details and a separate list of authorized users) within a Next.js route or component, always wrap the queries in a `Promise.all` block. This eliminates network waterfalls and improves page load performance.
