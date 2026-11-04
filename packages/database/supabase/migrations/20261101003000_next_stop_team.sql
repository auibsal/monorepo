-- C20 (the design review, Nov 4, 2026): Next Stop's page names its team
-- from the roles people hold, like the Council page: whoever holds the
-- Video Editor (Qirtas's Video section, where Next Stop is) or the Photo
-- and Video Lead (Media) role, in force, by name and title. Names and
-- titles only, read by anyone.

create function private.next_stop_team()
returns table (
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
  select p.full_name_en, p.full_name_ar,
    coalesce(a.title_en, r.name_en), coalesce(a.title_ar, r.name_ar)
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join core.profiles p on p.id = a.user_id
  where a.role in ('video_editor', 'photo_video_lead')
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  order by r.sort, p.full_name_en;
$$;
revoke all on function private.next_stop_team() from public;
grant execute on function private.next_stop_team() to anon, authenticated, service_role;

create function journal.next_stop_team()
returns table (
  full_name_en text,
  full_name_ar text,
  title_en text,
  title_ar text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.next_stop_team() $$;
revoke all on function journal.next_stop_team() from public;
grant execute on function journal.next_stop_team() to anon, authenticated, service_role;
