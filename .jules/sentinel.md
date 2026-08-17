## 2026-08-17 - Privilege Escalation via user_metadata
**Vulnerability:** Next.js middleware used `user.user_metadata?.role` for authorization checks.
**Learning:** Users can arbitrarily modify their own `user_metadata` using `supabase.auth.updateUser()`, allowing any user to grant themselves admin privileges.
**Prevention:** Always extract roles and sensitive claims from `user.app_metadata`, which is strictly managed by the server.
