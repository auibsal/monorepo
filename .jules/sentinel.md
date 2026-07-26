## 2026-07-26 - Critical Privilege Escalation via user_metadata
**Vulnerability:** Authorization logic in proxy middleware extracted user roles from user.user_metadata instead of user.app_metadata.
**Learning:** In Supabase, user_metadata can be arbitrarily modified by authenticated users via supabase.auth.updateUser(), making it highly insecure for authorization. app_metadata is securely managed by the server/service-role.
**Prevention:** Never use user_metadata for role-based access control. Always extract user roles and sensitive claims from app_metadata.
