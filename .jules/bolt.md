## 2024-05-24 - Batch Independent Database Queries for Sitemap Generation
**Learning:** Fetching independent datasets sequentially blocks sitemap generation and introduces network waterfalls, degrading build performance.
**Action:** When querying multiple distinct, independent datasets (e.g., `journal_issues`, `blog_posts`, `submissions`), always wrap the queries in a `Promise.all` block to execute them concurrently, eliminating network waterfalls and improving generation/load performance.
