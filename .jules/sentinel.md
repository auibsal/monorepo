## 2024-07-24 - Supabase Authorization Bypass via user_metadata
**Vulnerability:** Role-based access control was extracting roles from `user.user_metadata`, which is client-writable.
**Learning:** Authenticated users can arbitrarily modify their own `user_metadata` via `supabase.auth.updateUser()`, causing privilege escalation.
**Prevention:** Always extract sensitive claims and roles from `user.app_metadata`, which is strictly managed by the server/service-role.
