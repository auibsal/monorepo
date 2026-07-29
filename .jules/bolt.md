## 2026-07-29 - Batched Database Queries
**Learning:** Sequential await calls to independent PostgREST endpoints in Server Components create network waterfalls and increase TTFB.
**Action:** Wrap independent datasets in a `Promise.all` block to execute them concurrently.
