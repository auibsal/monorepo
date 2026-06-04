## 2024-06-04 - XSS via Zod URL Validation
**Vulnerability:** Zod's default `z.string().url()` allows dangerous schemes like `javascript:` and `data:`.
**Learning:** These schemes can be exploited for XSS when rendered in DOM elements like iframes or links.
**Prevention:** Always add a `.refine()` block to explicitly require `http://` or `https://` protocols.
