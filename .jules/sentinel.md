## 2026-08-13 - Privilege Escalation via user_metadata
**Vulnerability:** Role extraction from user_metadata in middleware.
**Learning:** In Supabase, user_metadata can be modified by the user, while app_metadata is secure. Using user_metadata for roles allows privilege escalation.
**Prevention:** Always use app_metadata for authorization checks.
