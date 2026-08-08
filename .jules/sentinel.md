## 2024-08-08 - Critical Privilege Escalation via user_metadata
**Vulnerability:** Extracted user roles from `user.user_metadata` for authorization logic.
**Learning:** Authenticated users can arbitrarily modify `user.user_metadata` using `supabase.auth.updateUser()`, allowing privilege escalation. `app_metadata` is managed securely by the server.
**Prevention:** Always extract roles and sensitive claims strictly from `user.app_metadata`.
