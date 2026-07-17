## 2024-07-17 - Zod Default URL Validation XSS Risk
**Vulnerability:** Zod's default `.url()` validation allows dangerous schemes like `javascript:`, creating XSS vulnerabilities when rendered in DOM elements.
**Learning:** Zod only validates that the string is a valid URI according to RFCs, it does not restrict to web protocols.
**Prevention:** Always add a case-insensitive `.refine(val => val.toLowerCase().startsWith('http'))` block after `.url()` before applying `.nullable()` or `.optional()`.
