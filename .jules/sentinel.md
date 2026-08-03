## 2024-06-25 - Privilege Escalation
**Vulnerability:** Role extraction from user_metadata in middleware.
**Learning:** In Supabase, user_metadata can be modified by authenticated users, leading to privilege escalation if used for authorization.
**Prevention:** Strictly extract user roles and sensitive claims from user.app_metadata (managed securely by the server/service-role).
