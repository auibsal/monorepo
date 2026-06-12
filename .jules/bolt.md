## 2026-06-12 - Payload Size Reduction for List Views
**Learning:** Overfetching data by using `select('*')` in list views creates massive payload bloat, especially when returning unneeded columns or large content fields.
**Action:** Always explicitly specify required columns using `select('col1, col2')` and strongly type the expected response to limit payload size and improve client-side rendering performance.
