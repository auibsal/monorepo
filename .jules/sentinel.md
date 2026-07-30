## 2026-07-30 - Privilege Escalation via user_metadata
**Vulnerability:** Role-based access control was checking `user.user_metadata.role`.
**Learning:** Users can arbitrarily modify `user.user_metadata` via `supabase.auth.updateUser()`, leading to privilege escalation.
**Prevention:** Always extract sensitive claims and roles from `user.app_metadata`, which is managed securely by the server/service-role.
