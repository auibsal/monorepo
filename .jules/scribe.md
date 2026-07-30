## 2026-07-30 - Environment Variables and Zod Schema Parity
Insight: The .env.example file was missing several variables defined as required in the @auibsal/env Zod schema, causing confusion and setup failures for developers.
Rule: Whenever adding or modifying environment variables in the @auibsal/env Zod schema, ensure .env.example is updated synchronously. All z.string().url() requirements must be matched with development-ready mock HTTP URLs in .env.example to prevent local setup failures.
