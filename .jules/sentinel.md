## 2024-06-05 - Missing Protocol Validation in Zod URLs
**Vulnerability:** Zod's `z.string().url()` accepts dangerous protocols like `javascript:` or `data:`, which can lead to Stored XSS when these URLs are subsequently rendered in the DOM (e.g. `href` attributes).
**Learning:** Default URL validation in many libraries only checks format, not protocol safety.
**Prevention:** Always append a `.refine(val => val.startsWith('http'))` to Zod URL validators before `.nullable()` or `.optional()`.