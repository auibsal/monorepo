## 2025-02-28 - Open Redirect / DOM-based XSS Bypass via Whitespace and Backslashes

**Vulnerability:** The application attempted to prevent open redirects by ensuring the `next` redirect query parameter started with a single slash (`startsWith('/') && !startsWith('//')`). However, this is insufficient because URLs containing backslashes (e.g., `/\attacker.com`) or whitespace (e.g., `/ javascript:alert(1)`) bypass these checks in many browsers and routing systems, leading to Open Redirect or DOM-based XSS.
**Learning:** Checking for a leading slash is not enough to guarantee a relative URL in Next.js or browser environments. Browsers often normalize backslashes to forward slashes, and whitespace can manipulate protocol parsing.
**Prevention:** Always explicitly reject backslashes (`.includes('\\')`) and whitespace characters (`/[\s]/.test()`) when validating relative redirect URLs, in addition to the standard single-slash check.
