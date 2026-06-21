## 2026-06-21 - Fix DOM XSS/Open Redirect in Next.js Client Routing
**Vulnerability:** A Next.js login component used `window.location.href = next` to handle redirection after authentication, exposing a DOM-based XSS (via `javascript:` URIs) and Open Redirect vulnerability if the `next` parameter was improperly sanitized.
**Learning:** Even though Next.js provides robust server-side routing, relying on raw browser APIs like `window.location.href` in Client Components bypasses framework-level safety mechanisms.
**Prevention:** Always use the `useRouter` hook (`next/navigation`) and `router.push()` for client-side navigation within Next.js apps, as it natively mitigates `javascript:` URI execution and handles relative paths securely.
