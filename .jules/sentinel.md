## 2024-11-20 - Info Leakage in Error Responses
**Vulnerability:** Returning raw Error objects in catch blocks exposes internal stack traces or API details to the caller.
**Learning:** Error responses should be generic and not leak internal system information, following the "Fail securely" principle.
**Prevention:** Catch errors, log them securely, and return a sanitized, generic error message to the client.