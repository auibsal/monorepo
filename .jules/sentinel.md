## 2026-07-28 - Authorization Bypass via user_metadata
**Vulnerability:** Extracted user roles from `user.user_metadata` in middleware (`proxy.ts`) for authorization.
**Learning:** In Supabase, `user_metadata` can be arbitrarily modified by authenticated users via `supabase.auth.updateUser()`, allowing privilege escalation. `app_metadata` must be used for sensitive claims as it is controlled by the server.
**Prevention:** Always extract roles and permissions from `user.app_metadata`.
