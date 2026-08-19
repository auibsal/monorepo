## 2026-08-19 - Privilege Escalation via user_metadata
**Vulnerability:** Extracted user role from `user.user_metadata` in authorization middleware.
**Learning:** In Supabase, `user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, leading to privilege escalation if used for authorization. Only `app_metadata` is secure.
**Prevention:** Never use `user.user_metadata` for authorization logic or role-based access control; strictly extract user roles and sensitive claims from `user.app_metadata`.
