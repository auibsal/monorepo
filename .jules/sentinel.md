## 2025-02-28 - Zod URL Validation XSS Vector
**Vulnerability:** The Zod schema for file_url using `z.string().url()` was insufficient and vulnerable to XSS.
**Learning:** `z.string().url()` accepts dangerous protocols like `javascript:` and `data:`, which can be leveraged for Cross-Site Scripting (XSS) if rendered dynamically in `href` or `src` attributes without further protocol sanitization.
**Prevention:** Always append a `.refine()` block requiring `http` or `https` (e.g. `.refine(val => val.toLowerCase().startsWith('http'))`) when validating general URLs to ensure they only point to standard external web resources and cannot execute scripts in the browser context.
