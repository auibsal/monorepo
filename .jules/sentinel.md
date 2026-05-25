## 2025-05-25 - Open Redirect Bypass via Backslash and Whitespace

**Vulnerability:** The application attempted to prevent open redirects by ensuring redirect URLs started with `/` and not `//`. However, this could be bypassed using `/\` or whitespace characters like `/\n/`, which browsers normalize into cross-origin URLs (e.g., `https://evil.com`).
**Learning:** Checking `startsWith('/')` and `!startsWith('//')` is insufficient for validating relative URLs. Browsers parse schema-relative URLs permissively and convert backslashes to forward slashes, and ignore newlines.
**Prevention:** Always validate relative URLs by explicitly rejecting backslashes and whitespace characters, e.g., `url.includes('\\') || /[\s]/.test(url)`.
