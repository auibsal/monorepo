## 2024-10-27 - Supabase RBAC Privilege Escalation
**Vulnerability:** Authorization logic used user.user_metadata?.role instead of user.app_metadata?.role.
**Learning:** In Supabase, user_metadata can be modified by the user directly via supabase.auth.updateUser(), making it unsafe for authorization claims.
**Prevention:** Always use user.app_metadata for sensitive roles/claims as it is secure and only modifiable by the server (service role).
