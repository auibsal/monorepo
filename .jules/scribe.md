## 2026-09-05 - Environment Variables Config Discrepancy
Insight: The .env.example file was missing critical QStash and Upstash Redis environment variables that are required and strictly validated in packages/env/src/index.ts.
Rule: Any required environment variables added to @t3-oss/env-nextjs validation schema must also be present in .env.example with dummy or descriptive values to prevent immediate startup failures for new developers.
