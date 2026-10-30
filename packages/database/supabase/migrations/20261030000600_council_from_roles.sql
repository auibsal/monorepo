-- The Council page comes from the roles people hold (owner, Oct 30, 2026):
-- whoever holds a Council role (`access.roles.is_council`, global scope,
-- in force today) is on it, under the role's title or their assignment's
-- display title. Someone who holds two roles at once is named once, with
-- both titles. The seats the General Secretary kept by hand
-- (`governance.council_seats`, migration 20261030000200) are gone: an open
-- role covered by an officer is that officer's second role.

drop table governance.council_seats;

create function private.council_members()
returns table (
  full_name_en text,
  full_name_ar text,
  titles_en text[],
  titles_ar text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with held as (
    select distinct on (a.user_id, a.role)
      a.user_id,
      coalesce(a.title_en, r.name_en) as title_en,
      coalesce(a.title_ar, r.name_ar) as title_ar,
      r.sort
    from access.role_assignments a
    join access.roles r on r.key = a.role
    where r.is_council
      and a.scope_type = 'global'
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
    -- Prefer the assignment with a display title, then the oldest.
    order by a.user_id, a.role, (a.title_en is null), a.starts_at
  )
  select
    p.full_name_en,
    p.full_name_ar,
    array_agg(h.title_en order by h.sort, h.title_en),
    array_agg(h.title_ar order by h.sort, h.title_en)
  from held h
  join core.profiles p on p.id = h.user_id
  group by h.user_id, p.full_name_en, p.full_name_ar
  order by min(h.sort), p.full_name_en;
$$;

revoke all on function private.council_members() from public;
grant execute on function private.council_members() to anon, authenticated, service_role;

create function governance.council_members()
returns table (
  full_name_en text,
  full_name_ar text,
  titles_en text[],
  titles_ar text[]
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.council_members() $$;

revoke all on function governance.council_members() from public;
grant execute on function governance.council_members() to anon, authenticated, service_role;

comment on function governance.council_members() is
  'The Council page: each person holding a Council role, once, with every title they hold. Public.';
