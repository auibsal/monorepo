## 2026-08-09 - Privilege Escalation via user_metadata
**Vulnerability:** Role extraction from `user.user_metadata` in proxy middleware.
**Learning:** `user_metadata` can be updated by any authenticated user via `supabase.auth.updateUser()`, causing privilege escalation.
**Prevention:** Always use `user.app_metadata` for roles and sensitive claims, as it is strictly managed by the server/service-role.
