## 2024-05-15 - [Zod URL Validation Vulnerability]
**Vulnerability:** Zod's default `z.string().url()` allows dangerous URI schemes like `javascript:` and `data:`, leading to potential XSS vulnerabilities when URLs are rendered in DOM elements like iframes or links.
**Learning:** Default URL validators often only check for structural validity of a URI, not protocol safety. This codebase previously accepted arbitrary URLs for file uploads (`file_url`).
**Prevention:** When validating URLs with Zod, always add a case-insensitive `.refine()` block to explicitly require `http://` or `https://` protocols (e.g., `.refine(val => val.toLowerCase().startsWith('http'))`) before chaining `.nullable()` or `.optional()`.
