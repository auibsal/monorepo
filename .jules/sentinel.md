## 2026-08-15 - Privilege Escalation via user_metadata
**Vulnerability:** Authorization logic relied on `user.user_metadata.role` instead of `user.app_metadata.role`.
**Learning:** In Supabase, `user.user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, leading to critical privilege escalation. Sensitive claims must reside in `app_metadata`.
**Prevention:** Never use `user.user_metadata` for authorization or role-based access control. Strictly extract user roles and sensitive claims from `user.app_metadata`.
