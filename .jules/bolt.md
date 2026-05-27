## 2026-05-27 - Optimize Supabase fetch in Web Journal and Nexus Events/Journal/Admin Users
**Learning:** Found several places where `select('*')` was used to fetch database records instead of specifically naming only required columns. This inflates network payloads.
**Action:** Replace `select('*')` with explicit column selections.
## 2026-05-27 - Type conflicts with Supabase select
**Learning:** Selecting specific columns instead of `select('*')` changes the return type in TypeScript, which conflicts with generated Supabase database schema types used in `useState<TableType[]>`.
**Action:** When migrating from `select('*')` to specific columns, use `Pick<TableType, 'col1' | 'col2'>` to strictly alias the response in React states.
## 2026-05-27 - Type conflicts with Supabase select
**Learning:** Selecting specific columns instead of `select('*')` changes the return type in TypeScript, which conflicts with generated Supabase database schema types used in `useState<TableType[]>`.
**Action:** When migrating from `select('*')` to specific columns, use `Pick<TableType, 'col1' | 'col2'>` to strictly alias the response in React states.
