## 2024-05-15 - Prevent Privilege Escalation via user_metadata
**Vulnerability:** Authorization logic in proxy.ts extracted the user's role from user.user_metadata, which can be modified by the user via supabase.auth.updateUser(), leading to privilege escalation.
**Learning:** user_metadata is insecure for authorization because it is mutable by authenticated users, whereas app_metadata is managed securely by the server.
**Prevention:** Always extract user roles and sensitive claims from user.app_metadata in Supabase applications.
