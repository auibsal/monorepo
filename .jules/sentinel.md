## 2024-07-29 - RBAC Privilege Escalation via user_metadata
**Vulnerability:** Authorization logic was extracting user roles from `user.user_metadata`.
**Learning:** In Supabase, `user.user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, making it insecure for authorization.
**Prevention:** Always use `user.app_metadata` (managed by service role) for extracting sensitive claims and roles.
