## 2026-08-21 - Privilege Escalation via user_metadata
**Vulnerability:** RBAC role was extracted from `user_metadata`.
**Learning:** In Supabase, `user_metadata` can be arbitrarily modified by authenticated users, making it unsafe for authorization logic. This allows for privilege escalation.
**Prevention:** Always extract sensitive claims and roles from `app_metadata`, which is managed securely by the server.
