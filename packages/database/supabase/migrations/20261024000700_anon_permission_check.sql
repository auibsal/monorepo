-- Visitors who are not signed in read public rows through policies that also
-- ask private.has_permission() (active programs, public settings). The
-- function answers false for them, but they must be allowed to call it: in
-- production anon had lost EXECUTE on it after the bodies moved to the
-- private schema (20261024000000), so those reads failed with "permission
-- denied for function has_permission" and the public programs list and
-- settings came back empty. Grant it again; the function is SECURITY
-- DEFINER in an unexposed schema and does its own checks.
grant execute on function private.has_permission(text, text, uuid),
  private.has_permission_anywhere(text)
  to anon, authenticated, service_role;
