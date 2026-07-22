## 2024-07-22 - Authorization Bypass via user_metadata
**Vulnerability:** Supabase user role was extracted from user.user_metadata.
**Learning:** Users can modify their own user_metadata using Supabase auth.updateUser(), leading to privilege escalation.
**Prevention:** Always use user.app_metadata for sensitive claims like roles, as it can only be modified securely by the server.
