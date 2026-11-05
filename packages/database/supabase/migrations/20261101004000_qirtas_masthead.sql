-- Qirtas's masthead (owner, Nov 5, 2026): the people who make the paper,
-- from the roles they hold, never kept by hand. The Editor-in-Chief first,
-- then the Managing Editor and every role the Editor-in-Chief hires
-- (hiring_owner 'qirtas'), and an Edition's guest editors, in the roles'
-- order. Names only, in the first-and-last form the site shows everywhere.

create function private.qirtas_masthead()
returns table (
  role text,
  full_name_en text,
  full_name_ar text,
  title_en text,
  title_ar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (r.sort, p.full_name_en, a.role)
    a.role, p.full_name_en, p.full_name_ar,
    coalesce(nullif(btrim(a.title_en), ''), r.name_en),
    coalesce(nullif(btrim(a.title_ar), ''), r.name_ar)
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join core.profiles p on p.id = a.user_id
  where (a.role in ('eic', 'managing_editor', 'guest_editor') or r.hiring_owner = 'qirtas')
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  order by r.sort, p.full_name_en, a.role;
$$;
revoke all on function private.qirtas_masthead() from public;
grant execute on function private.qirtas_masthead() to anon, authenticated, service_role;

create function journal.masthead()
returns table (
  role text,
  full_name_en text,
  full_name_ar text,
  title_en text,
  title_ar text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.qirtas_masthead() $$;
revoke all on function journal.masthead() from public;
grant execute on function journal.masthead() to anon, authenticated, service_role;
