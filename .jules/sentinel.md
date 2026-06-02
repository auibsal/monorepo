## 2025-02-19 - Zod URL Validation XSS Vector
**Vulnerability:** The Zod `z.string().url()` schema accepts potentially dangerous URI schemes like `javascript:` and `data:`, leading to potential Stored XSS when user-supplied URLs (like `file_url`) are rendered in the DOM (e.g. inside an `iframe` or `Image` tag).
**Learning:** Zod's default `.url()` validator only checks if the string is structurally a valid URI according to the WHATWG specification, not if it's safe for a web browser to navigate or render.
**Prevention:** Always append a `.refine()` block to explicitly require `http://` or `https://` protocols (e.g., `.refine(val => val.startsWith('https://') || val.startsWith('http://'))`) when accepting URLs.
