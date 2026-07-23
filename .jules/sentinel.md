## 2026-07-23 - Privilege Escalation via user_metadata
**Vulnerability:** User role extracted from user.user_metadata in proxy.ts, allowing users to escalate privileges via supabase.auth.updateUser().
**Learning:** user.user_metadata can be modified by authenticated users and should never be used for authorization.
**Prevention:** Always use user.app_metadata (which is secure and managed by service roles) to extract roles and sensitive claims.
