## 2025-03-05 - Submissions Page Performance
**Learning:** Sequential database queries inside SSR loops or critical render paths create significant network waterfalls, penalizing load performance.
**Action:** Always map independent database queries or async state initialization tasks to a `Promise.all` execution block to guarantee concurrent resolution.
