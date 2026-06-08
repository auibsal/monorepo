## 2025-02-28 - Zod URL Validation XSS Vector
**Vulnerability:** Zod's `z.string().url()` validation implicitly allows dangerous schemes like `javascript:` and `data:`, creating potential XSS vectors when URLs are rendered dynamically in links or iframes.
**Learning:** Zod's default `.url()` validation is overly permissive for standard web application links and should not be trusted for user-provided URLs intended for navigation or rendering without explicit protocol filtering.
**Prevention:** Always append a `.refine(val => val.toLowerCase().startsWith('http'), { message: 'URL must use http or https scheme' })` block immediately after `.url()` when validating URLs, before applying `.nullable()` or `.optional()`.
