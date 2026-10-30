-- Council roles (owner, Oct 30, 2026).
--
-- * Covering a seat: someone may hold a second Council role when the
--   Council has adopted a resolution allowing it (Constitution 6.6: the
--   Council may combine roles in one person, recording why). Without one,
--   one person still holds one Council seat. The Council page names them
--   once, with both titles (governance.council_members).
-- * The Artistic Director, the Company's director, sits on the Council: a
--   Council role with two-step sign-in. It runs every production (the
--   Company's: stages, rights, auditions, casting, rehearsals and
--   performances), checks people in at the door, reads the Council's
--   library and picks the people for the Company's openings. It has no
--   rights over other programs' calendars or the site's content.

create or replace function private.role_conflict(
  target_user uuid,
  role_key text,
  scope_type text,
  scope_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  exception_resolution uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  council boolean;
  roles text[];
  same boolean;
  leaders integer;
  excepted boolean;
begin
  select r.is_council into council from access.roles r where r.key = role_key;

  -- Roles held in a period that overlaps the new assignment's.
  select coalesce(array_agg(distinct a.role), '{}'),
    coalesce(bool_or(a.role = role_key and a.scope_type = role_conflict.scope_type
      and a.scope_id is not distinct from role_conflict.scope_id), false)
  into roles, same
  from access.role_assignments a
  where a.user_id = target_user
    and a.starts_at < coalesce(role_conflict.ends_at, 'infinity'::timestamptz)
    and coalesce(a.ends_at, 'infinity'::timestamptz) > role_conflict.starts_at;

  if same then
    return 'already_holds_role';
  end if;
  if (role_key = 'faculty_advisor' and cardinality(roles) > 0) or 'faculty_advisor' = any (roles) then
    return 'advisor_holds_no_other_role';
  end if;

  -- A resolution the Council adopted allows what the rules below refuse.
  excepted := exception_resolution is not null and exists (
    select 1 from governance.resolutions res
    where res.id = exception_resolution and res.status = 'adopted' and res.body = 'council'
  );

  if council and exists (
    select 1 from access.roles r where r.key = any (roles) and r.is_council
  ) then
    if exception_resolution is null then
      return 'one_council_seat';
    end if;
    if not excepted then
      return 'exception_needs_adopted_resolution';
    end if;
  end if;

  select count(*) into leaders from unnest(roles) held where private.is_leadership_role(held);
  -- The new role may already be held in another scope; count it once.
  if not (role_key = any (roles))
    and (cardinality(roles) >= 2 or (private.is_leadership_role(role_key) and leaders >= 1)) then
    if exception_resolution is null then
      return case when cardinality(roles) >= 2 then 'two_roles_at_most' else 'one_leadership_role' end;
    end if;
    if not excepted then
      return 'exception_needs_adopted_resolution';
    end if;
  end if;

  return null;
end;
$$;

revoke all on function private.role_conflict(uuid, text, text, uuid, timestamptz, timestamptz, uuid)
  from public, anon, authenticated;

-- ── The Artistic Director ───────────────────────────────────────────────────

insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('artistic_director', 'Artistic Director', 'المدير الفني', true, 57)
on conflict (key) do nothing;
update access.roles set requires_mfa = true where key = 'artistic_director';

insert into access.role_permissions (role, permission) values
  ('artistic_director', 'productions.manage'),
  ('artistic_director', 'events.checkin'),
  ('artistic_director', 'library.read'),
  ('artistic_director', 'library.council')
on conflict do nothing;

-- The Company's openings are picked by whoever runs its productions, as a
-- program's are by whoever manages the program.
create or replace function private.manages_opening(programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when manages_opening.programme_id is null then private.has_permission_anywhere('programmes.manage')
    else private.has_permission('programmes.manage', 'programme', manages_opening.programme_id)
      or (
        exists (select 1 from core.programmes p where p.id = manages_opening.programme_id and p.slug = 'company')
        and private.has_permission('productions.manage')
      )
  end;
$$;
