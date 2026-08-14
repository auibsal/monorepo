## 2024-05-24 - [Auth] Privilege Escalation via user_metadata
**Vulnerability:** Authorization logic was extracting the user role from `user.user_metadata`.
**Learning:** In Supabase, `user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, making it completely untrusted for authorization claims.
**Prevention:** Always use `user.app_metadata` for secure, server-managed claims and roles.
