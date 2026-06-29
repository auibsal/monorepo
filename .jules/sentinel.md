## 2025-06-29 - [Fix XSS vulnerability in DOMPurify]
**Vulnerability:** DOMPurify was used to sanitize HTML but was lacking the `ALLOWED_URI_REGEXP` configuration, leaving it vulnerable to dangerous URI schemes like `javascript:`.
**Learning:** Even well-known sanitizers need explicit configurations tailored to the application's needs to ensure maximum security. Relying on defaults isn't always sufficient.
**Prevention:** Always explicitly define `ALLOWED_URI_REGEXP` when using DOMPurify to strictly whitelist safe protocols (http, https, mailto, etc.).
