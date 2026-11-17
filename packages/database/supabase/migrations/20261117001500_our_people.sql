-- About → Our people (decisions.md, The Council and the roles: "How teams
-- are shown"): each department's team under its seat, by the short name
-- each person goes by. Every role holder is listed; a member under 18
-- only once a parent has consented. Scoped roles (a production's cast and
-- crew, readers, a mentor's class) are credited where they work instead.

-- The seat each team answers to.
create function private.role_seat(role text, owner text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when owner = 'qirtas' or role like '%editor' then 'eic'
    when owner = 'media' then 'media_director'
    when owner = 'partnerships' then 'partnerships_director'
    when owner = 'membership' then 'membership_director'
    when owner = 'program' then 'events_director'
  end
$$;

create function private.society_people()
returns table (seat text, role text, title_en text, title_ar text, name_en text, name_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (s.sort, r.sort, a.user_id, r.key)
    s.key,
    r.key,
    coalesce(nullif(btrim(a.title_en), ''), r.name_en),
    coalesce(
      nullif(btrim(a.title_ar), ''),
      case when p.title_form = 'feminine' then r.name_ar_feminine end,
      r.name_ar
    ),
    private.display_name(p, 'en'),
    private.display_name(p, 'ar')
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join access.roles s on s.key = private.role_seat(r.key, r.hiring_owner)
  join core.profiles p on p.id = a.user_id
  where r.kind = 'team'
    and not r.retired
    and a.scope_type = 'global'
    and not a.covering
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
    and not private.is_limited_minor(a.user_id)
  order by s.sort, r.sort, a.user_id, r.key;
$$;

revoke all on function private.role_seat(text, text), private.society_people() from public;
grant execute on function private.role_seat(text, text), private.society_people()
  to anon, authenticated, service_role;

create function governance.society_people()
returns table (seat text, role text, title_en text, title_ar text, name_en text, name_ar text)
language sql
stable
set search_path = ''
as $$ select * from private.society_people() $$;
revoke all on function governance.society_people() from public;
grant execute on function governance.society_people() to anon, authenticated, service_role;

select private.build_api();
