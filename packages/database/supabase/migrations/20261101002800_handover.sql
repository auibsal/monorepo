-- A39 (the design review, Nov 4, 2026): the Desk's handover view. What
-- waits across the Society, how long the oldest has waited, and who owns
-- it: the people whose roles (global, in force) hold the permission that
-- acts on it, by name and title, as the Council page names them. Any
-- officer may read it (counts and officers' names only; nothing about a
-- member, an applicant or a piece).

create function private.handover()
returns table (
  item text,
  waiting bigint,
  oldest_at timestamptz,
  owners jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff((select auth.uid())) then
    raise exception 'Officers only' using errcode = '42501';
  end if;
  return query
  with items (item, permission, sort, waiting, oldest_at) as (
    select 'partner_applications', 'partners.sign', 1,
      (select count(*) from private.partner_applications()),
      (select min(applied_at) from private.partner_applications())
    union all
    select 'grants_asked', 'partners.manage', 2,
      (select count(*) from governance.partner_agreements a
        where a.asked_grants is not null and a.status = 'signed'),
      (select min(a.updated_at) from governance.partner_agreements a
        where a.asked_grants is not null and a.status = 'signed')
    union all
    select 'perks_waiting', 'partners.manage', 3,
      (select count(*) from governance.member_offers o
        where o.submitted_at is not null and not o.is_published),
      (select min(o.submitted_at) from governance.member_offers o
        where o.submitted_at is not null and not o.is_published)
    union all
    select 'submissions_new', 'journal.manage', 4,
      (select count(*) from journal.submissions s
        where s.status in ('received', 'intake_check')),
      (select min(s.created_at) from journal.submissions s
        where s.status in ('received', 'intake_check'))
    union all
    select 'hiring_new', 'members.manage', 5,
      (select count(*) from programmes.opening_replies r where r.status = 'new'),
      (select min(r.created_at) from programmes.opening_replies r where r.status = 'new')
    union all
    select 'requests_open', 'governance.manage', 6,
      (select count(*) from governance.form_submissions f
        where f.status in ('submitted', 'acknowledged')),
      (select min(coalesce(f.submitted_at, f.created_at)) from governance.form_submissions f
        where f.status in ('submitted', 'acknowledged'))
  )
  select i.item, i.waiting, i.oldest_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
          'name_en', o.full_name_en, 'name_ar', o.full_name_ar,
          'title_en', o.title_en, 'title_ar', o.title_ar
        ) order by o.sort, o.full_name_en)
      from (
        select distinct on (a.user_id)
          p.full_name_en, p.full_name_ar,
          coalesce(a.title_en, r.name_en) as title_en,
          coalesce(a.title_ar, r.name_ar) as title_ar,
          r.sort
        from access.role_assignments a
        join access.role_permissions rp on rp.role = a.role
        join access.roles r on r.key = a.role
        join core.profiles p on p.id = a.user_id
        where rp.permission = i.permission
          and a.scope_type = 'global'
          and a.starts_at <= now()
          and (a.ends_at is null or a.ends_at > now())
        order by a.user_id, r.sort
      ) o
    ), '[]'::jsonb)
  from items i
  order by i.sort;
end;
$$;
revoke all on function private.handover() from public, anon;
grant execute on function private.handover() to authenticated, service_role;

create function core.handover()
returns table (
  item text,
  waiting bigint,
  oldest_at timestamptz,
  owners jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.handover() $$;
revoke all on function core.handover() from public, anon;
grant execute on function core.handover() to authenticated, service_role;
