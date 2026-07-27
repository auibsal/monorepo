## 2026-07-27 - Privilege Escalation in RBAC Middleware
**Vulnerability:** Authorization logic used user.user_metadata?.role to determine user permissions.
**Learning:** user_metadata can be arbitrarily modified by authenticated users via supabase.auth.updateUser(), allowing them to elevate their privileges.
**Prevention:** Always use user.app_metadata for authorization logic, as it is managed securely by the server/service-role.
