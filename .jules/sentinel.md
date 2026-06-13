## 2024-05-18 - Prevented XSS and SSRF vulnerabilities in environment configurations
**Vulnerability:** The Zod `z.string().url()` validator was being used for `.env` URL validation which allows inherently dangerous URI schemes such as `javascript:` and `data:`. This could lead to XSS or SSRF vulnerabilities if those values are trusted without further validation.
**Learning:** `z.string().url()` in Zod verifies only that the string matches a generic URL pattern. It does not enforce specific protocols, meaning it accepts schemes other than `http` and `https`.
**Prevention:** In the future, explicitly require `http` or `https` schemes in `.env` URL schemas by chaining a case-insensitive `.refine(val => val.toLowerCase().startsWith('http'))` block.
