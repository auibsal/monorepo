## 2026-07-24 - Prevent Privilege Escalation
**Vulnerability:** Role extraction from `user_metadata` in proxy middleware allowed authenticated users to escalate privileges.
**Learning:** Supabase allows users to arbitrarily modify their `user_metadata` via auth updates. Trusting it for authorization leads to critical privilege escalation.
**Prevention:** Always extract sensitive claims and roles from `app_metadata`, which is securely managed by the server.
