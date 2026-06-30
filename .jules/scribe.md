## 2024-05-24 - Environment Validation Discrepancies
Insight: The strict Zod environment validation in `@auibsal/env` causes local setup failures if `.env.example` is incomplete. Missing mock values block basic project installation and building for new contributors.
Rule: `.env.example` must be updated synchronously with any `@auibsal/env` schema changes. Ensure all `z.string().url()` requirements in `@auibsal/env` are matched with development-ready mock HTTP URLs in `.env.example`.
