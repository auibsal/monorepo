## 2026-07-30 - Privilege Escalation via Supabase user_metadata
**Vulnerability:** Authorization checks in middleware relied on `user_metadata` to extract user roles.
**Learning:** In Supabase, `user_metadata` can be freely modified by the authenticated user via `supabase.auth.updateUser()`, making it completely untrusted for RBAC. `app_metadata` is secure as it can only be updated via service-role.
**Prevention:** Never use `user_metadata` for authorization logic. Always extract roles and sensitive claims strictly from `user.app_metadata`.
