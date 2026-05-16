## 2024-05-16 - DOM-based XSS & Open Redirect via Unvalidated URL Parameter
**Vulnerability:** The `next` parameter in the login page and callback route was used directly in `window.location.href = next` and `NextResponse.redirect`, allowing arbitrary protocol navigation (e.g., `javascript:alert(1)`) or open redirects to external domains.
**Learning:** React Server Components/Client Components mapping URL parameters to sinks like `window.location.href` must still sanitize and validate the parameters. The `next` query parameter is a common vector.
**Prevention:** Always validate that redirect parameters are safe, relative paths (e.g., `startsWith('/') && !startsWith('//')`).
