## 2026-06-14 - Enforce Strict HTTP/HTTPS Protocols in Zod URL Validation
**Vulnerability:** Zod's default `z.string().url()` validation allows arbitrary URI schemes, including potentially dangerous ones like `javascript:` and `data:`. If these URLs are rendered in the DOM (e.g., in links or iframes) without further sanitization, it can lead to Cross-Site Scripting (XSS) or DOM-based vulnerabilities.
**Learning:** We must explicitly restrict the allowed schemes to `http://` and `https://` when validating URLs with Zod to prevent these risks.
**Prevention:** Always chain `.refine((val) => val.toLowerCase().startsWith('http'), { message: 'Must be an HTTP/HTTPS URL' })` to `z.string().url()` to explicitly require HTTP/HTTPS protocols.
