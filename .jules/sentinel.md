## 2024-05-15 - Use app_metadata instead of user_metadata for Authorization
**Vulnerability:** Role-based access control was extracting roles from `user.user_metadata`.
**Learning:** `user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, leading to critical privilege escalation.
**Prevention:** In Supabase applications, authorization logic and role-based access control must strictly extract user roles and sensitive claims from `user.app_metadata`, which is managed securely by the server/service-role.
