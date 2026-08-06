## 2026-08-06 - Authorization bypass vulnerability via user_metadata
**Vulnerability:** Authorization checks were using `user.user_metadata.role` instead of `user.app_metadata.role`.
**Learning:** In Supabase, `user.user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, which allows them to elevate their own privileges.
**Prevention:** Always use `user.app_metadata` (which is managed securely by the server/service-role) for authorization logic and role-based access control.
