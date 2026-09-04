## 2024-09-04 - Fix Privilege Escalation in Middleware Role Extraction
**Vulnerability:** The proxy middleware extracted the user's role from `user.user_metadata?.role` instead of `user.app_metadata?.role`.
**Learning:** `user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, leading to critical privilege escalation. Role information must be managed securely by the server/service-role and stored in `app_metadata`.
**Prevention:** Always extract authorization logic, user roles, and sensitive claims from `app_metadata` in Supabase applications, never from `user_metadata`.
