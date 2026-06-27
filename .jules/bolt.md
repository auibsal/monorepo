## 2025-02-28 - Network Waterfall in Dossier Queries
**Learning:** Sequential database queries inside `fetchDossierData` (in `apps/nexus/src/app/editorial/submissions/[id]/page.tsx`) were creating a network waterfall, significantly delaying page rendering since both independent queries (submission data and editor roster) were waiting on each other.
**Action:** When fetching independent datasets for page load in React, always wrap the Supabase queries in `Promise.all` to batch the execution and run them concurrently.
