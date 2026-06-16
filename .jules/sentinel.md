## 2025-02-28 - Zod URL Validation XSS Risk
**Vulnerability:** Zod's `z.string().url()` validation inherently accepts protocols like `javascript:` and `data:`, which can lead to XSS vulnerabilities when rendered in DOM elements like iframes or links.
**Learning:** Default URL validation libraries typically focus on URL structure conformity, not protocol safety.
**Prevention:** Always add a `.refine(val => val.toLowerCase().startsWith('http'), { message: 'Must be an HTTP/HTTPS URL' })` block when validating URLs with Zod to explicitly require safe protocols before chaining `.nullable()` or `.optional()`.
