## 2026-08-16 - Privilege Escalation via metadata
**Vulnerability:** Extracted authorization roles from user.user_metadata.
**Learning:** user_metadata can be arbitrarily modified by authenticated users via supabase.auth.updateUser(), leading to privilege escalation.
**Prevention:** Authorization logic must strictly extract user roles and sensitive claims from user.app_metadata, which is securely managed by the server.
