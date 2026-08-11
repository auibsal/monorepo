## 2026-08-11 - Privilege Escalation via Supabase user_metadata
**Vulnerability:** Role extraction from `user.user_metadata` allowed users to arbitrarily modify their own roles.
**Learning:** In Supabase, `user_metadata` is client-writable via `supabase.auth.updateUser()`, leading to critical privilege escalation. `app_metadata` is secure.
**Prevention:** Authorization logic must strictly extract user roles and sensitive claims from `user.app_metadata` (managed securely by the server/service-role).
