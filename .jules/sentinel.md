## 2025-03-09 - XSS Vulnerability in Zod URL Validation
**Vulnerability:** The Zod `z.string().url()` validation accepts dangerous schemes like `javascript:` and `data:`, leading to potential XSS vulnerabilities when the URL is rendered in DOM elements like iframes or links.
**Learning:** Default URL validation in libraries like Zod is often scheme-agnostic and prioritizes structural compliance over security context.
**Prevention:** Always add a case-insensitive `.refine()` block to explicitly require `http://` or `https://` protocols (e.g., `.refine(val => val.toLowerCase().startsWith('http'))`) before chaining `.nullable()` or `.optional()`.
