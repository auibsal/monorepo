## 2026-08-18 - Privilege Escalation via User Metadata
**Vulnerability:** Authorization checks relied on user.user_metadata.role, allowing authenticated users to escalate privileges using supabase.auth.updateUser().
**Learning:** user_metadata is controllable by the user, while app_metadata is managed securely by the server/service-role.
**Prevention:** Always extract roles and sensitive claims strictly from app_metadata.
