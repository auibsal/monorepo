## 2024-08-12 - Supabase user_metadata Privilege Escalation
**Vulnerability:** Authorization logic reading user roles from user.user_metadata.
**Learning:** user_metadata can be arbitrarily modified by authenticated users via supabase.auth.updateUser(), leading to privilege escalation.
**Prevention:** Always use user.app_metadata for authorization logic, as it is strictly managed by the server/service-role.
