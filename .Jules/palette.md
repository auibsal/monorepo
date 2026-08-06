## 2026-08-06 - Fixing Copy-Pasted Form Labels
**Learning:** When duplicating form inputs for a new page or section, it's easy to accidentally leave the `htmlFor` attribute pointing to an old, incorrect string (like `slug` for everything), and to forget the corresponding `id` attribute entirely. This completely breaks screen reader association and click-to-focus functionality.
**Action:** Always verify that every `label` has a unique `htmlFor` that exactly matches the `id` of its corresponding `input`.
