## 2026-07-21 - Prevent XSS in Zod URL Validation
**Vulnerability:** Default `z.string().url()` accepts dangerous URI schemes like `javascript:` and `data:` which can lead to Cross-Site Scripting (XSS) when rendered in DOM elements like `<a>` or `<iframe>`. This was present in `insertSubmissionSchema.file_url`.
**Learning:** Relying solely on `z.string().url()` is insufficient for security when user-provided URLs are later rendered. Zod's internal URL regex is permissive by design.
**Prevention:** Always attach a case-insensitive `.refine(val => val.toLowerCase().startsWith('http'))` validation block to strictly enforce HTTP/HTTPS protocols before chaining `.nullable()` or `.optional()`.
