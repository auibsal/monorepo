## 2026-06-03 - Insecure Zod URL Validation allowing XSS Via URL Schemes
**Vulnerability:** Zod's default `z.string().url()` validation accepts dangerous URI schemes like `javascript:` and `data:`, which can lead to Cross-Site Scripting (XSS) vulnerabilities if rendered as links or within iframes.
**Learning:** In applications accepting URLs (like `file_url` for submissions), omitting an explicit scheme check means user input can bypass intended validation and introduce malicious payloads.
**Prevention:** Always add a `.refine(val => val.startsWith('http://') || val.startsWith('https://'))` to explicitly require safe protocols before chaining `.nullable()` or `.optional()`.
