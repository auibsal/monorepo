
## 2024-06-13 - [Optimize Supabase queries for payload bloat]
**Learning:** Using `select('*')` in Supabase queries for list views causes payload bloat by transferring large, unused fields like descriptions or biographies over the network.
**Action:** Always explicitly pick only the required columns (e.g., `select('id, title')`) for list views and cards to prevent unnecessary network transfer.
