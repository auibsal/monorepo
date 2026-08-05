## 2024-08-05 - Supabase Role Authorization
**Vulnerability:** Using user_metadata for role extraction.
**Learning:** Authenticated users can modify user_metadata, leading to privilege escalation.
**Prevention:** Always extract user roles from app_metadata.
