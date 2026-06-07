## 2025-02-14 - URL Validation Security Gap
**Vulnerability:** Zod's `z.string().url()` allows dangerous protocols like `javascript:` and `data:`, which can lead to XSS vulnerabilities.
**Learning:** This is a known issue with Zod where URLs aren't restricted to `http`/`https` by default.
**Prevention:** Always add `.refine(val => val.startsWith('http'))` (or similar) when validating URLs with Zod to prevent protocol-based attacks.
