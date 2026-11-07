-- No perks or offers (decisions §2, Nov 7, 2026: the IRS line between a
-- sponsor's acknowledgment and advertising). Partners list no discounts,
-- codes, offers or benefits for members anywhere; sponsors in kind are
-- thanked with a "Supported by" line. The membership card is for the door
-- and for checking membership, nothing else. The offers table, its
-- trigger, the memorandum's "member_offer" grant and the "perks waiting"
-- count in the morning brief and the handover go.

drop table governance.member_offers;
drop function if exists private.perks_wait_for_the_society();

update governance.partner_agreements
set grants = array_remove(grants, 'member_offer'),
    asked_grants = array_remove(asked_grants, 'member_offer');

alter table governance.partner_agreements
  drop constraint partner_agreements_grants_check,
  add constraint partner_agreements_grants_check
    check (grants <@ array['journal_submissions', 'guest_editing', 'event_cohosting',
      'shared_branding', 'productions', 'volunteering']),
  drop constraint partner_agreements_asked_grants_check,
  add constraint partner_agreements_asked_grants_check
    check (asked_grants <@ array['journal_submissions', 'event_cohosting',
      'shared_branding', 'productions', 'volunteering']);

-- The morning brief without "perks waiting".
create or replace function core.telegram_staff_brief(at timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select
      (date_trunc('day', at at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad') as day_start,
      ((date_trunc('day', at at time zone 'Asia/Baghdad') + interval '1 day') at time zone 'Asia/Baghdad') as day_end
  )
  select jsonb_build_object(
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'slug', e.slug,
        'title_en', e.title_en,
        'title_ar', e.title_ar,
        'starts_at', e.starts_at,
        'venue_en', e.venue_en,
        'venue_ar', e.venue_ar,
        'entry', e.entry,
        'capacity', e.capacity,
        'booked', private.confirmed_count(e.id),
        'waitlisted', (select count(*) from events.waitlist w where w.event_id = e.id and w.status = 'waiting')
      ) order by e.starts_at)
      from events.events e, bounds b
      where e.status = 'published' and e.starts_at >= b.day_start and e.starts_at < b.day_end
    ), '[]'::jsonb),
    'waiting', jsonb_build_object(
      'partner_applications', (select count(*) from governance.partner_applications() pa),
      'grants_asked', (
        select count(*) from governance.partner_agreements a
        where a.asked_grants is not null and a.status = 'signed'
      ),
      'submissions_new', (
        select count(*) from journal.submissions s
        where s.status in ('received', 'intake_check')
      ),
      'hiring_new', (
        select count(*) from programmes.opening_replies r where r.status = 'new'
      ),
      'requests_open', (
        select count(*) from governance.form_submissions f
        where f.status in ('submitted', 'acknowledged')
      )
    )
  );
$$;

-- The handover without "perks waiting".
create or replace function private.handover()
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
