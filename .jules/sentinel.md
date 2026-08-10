## 2025-02-12 - Supabase user_metadata Privilege Escalation
**Vulnerability:** Authorization logic was extracting user roles from `user_metadata` in Next.js middleware instead of `app_metadata`.
**Learning:** In Supabase, `user_metadata` can be arbitrarily modified by any authenticated user via `supabase.auth.updateUser()`, making it highly insecure for storing roles or sensitive claims. Roles must exclusively be stored in `app_metadata`, which can only be modified securely by the server/service-role.
**Prevention:** Never use `user.user_metadata` for authorization or Role-Based Access Control (RBAC). Always strictly enforce retrieving roles from `user.app_metadata` (or fetching directly from a secure table fallback).
