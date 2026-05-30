## 2026-05-30 - [Missing Wayl Payment Environment Variables]
Insight: [The `.env.example` file documented Stripe keys instead of Wayl, which is the primary payment engine used in the codebase (in `packages/payments`). This discrepancy caused confusion on required setup steps.]
Rule: [Always verify the `.env.example` file matches the actual required environment variables across the monorepo packages and apps.]
