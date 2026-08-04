## 2026-08-04 - [CRITICAL: Insecure Authorization Data Source]
**Vulnerability:** Role-Based Access Control (RBAC) authorization logic uses `user.user_metadata` to extract user roles, which is user-modifiable.
**Learning:** In Supabase, `user_metadata` can be updated directly from the client by authenticated users using `supabase.auth.updateUser()`, leading to critical privilege escalation vulnerabilities.
**Prevention:** Authorization logic and role-based access control must strictly extract user roles and sensitive claims from `user.app_metadata` (managed securely by the server/service-role). Never use `user.user_metadata` for authorization.
