## 2024-08-07 - Privilege Escalation via user_metadata
**Vulnerability:** Authorization logic relied on user_metadata which can be arbitrarily modified by users.
**Learning:** In Supabase, user_metadata is mutable by authenticated users, leading to privilege escalation if used for RBAC.
**Prevention:** Always use app_metadata (which is managed securely by the server) for extracting user roles and sensitive claims.
