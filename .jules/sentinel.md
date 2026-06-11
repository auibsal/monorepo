## 2024-06-11 - [Zod URL Validation Vulnerability]
**Vulnerability:** Zod's default `.url()` validation accepts dangerous schemes like `javascript:` and `data:`, potentially leading to XSS or SSRF vulnerabilities if these URLs are rendered or fetched without additional checks.
**Learning:** We must explicitly require safe protocols (`http://` or `https://`) using a case-insensitive check.
**Prevention:** Always add a `.refine(val => val.toLowerCase().startsWith('http'))` block after `z.string().url()` to explicitly require `http` or `https` protocols. For optional fields, ensure `.refine()` is chained before `.optional()`.
