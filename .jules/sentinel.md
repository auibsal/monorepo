## 2025-02-20 - Prevent Dangerous URL Schemes in Zod Validations
**Vulnerability:** A Zod schema validation for a `file_url` used `z.string().url()` which accepts dangerous protocols like `javascript:` and `data:`, potentially leading to XSS vulnerabilities.
**Learning:** `z.string().url()` validates the generic URL format but doesn't restrict the scheme/protocol. When building schemas for URLs that should be HTTP/HTTPS (like web links), it's important to strictly enforce the protocol.
**Prevention:** Always add `.refine(val => val.toLowerCase().startsWith('http'), { message: 'Must be an HTTP/HTTPS URL' })` after `z.string().url()` (and before `.nullable().optional()`) to explicitly require HTTP/HTTPS protocols and reject XSS vectors like `javascript:`.
