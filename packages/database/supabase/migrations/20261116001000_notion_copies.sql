-- Notion's read-only copies (decisions.md, Where things live): every copy
-- the site writes sits under "From the site (read-only)". Beside Events,
-- Needs, the officers and Qirtas's counts come Editions, Productions (the
-- Company's productions and Next Stop's episodes), Openings, Organizations,
-- Announcements and resolutions, and the Measures, written on the first of
-- each month from the site's own records. One row per record, written only
-- by the site, with a link back to the Diwan; archived, never deleted,
-- when the record goes; never read back. Nothing about a person.

alter table core.notion_links drop constraint notion_links_kind_check;
alter table core.notion_links add constraint notion_links_kind_check check (kind in (
  'event', 'event_ar', 'news', 'officer', 'programme', 'programme_ar', 'document',
  'minutes', 'journal_stage', 'piece', 'piece_ar', 'need',
  'edition', 'production', 'episode', 'opening', 'organization', 'announcement',
  'resolution', 'measure'
));

-- The databases the co-pilot and the site made under "From the site
-- (read-only)" on Nov 16, 2026 (their data source ids, not personal data).
update core.settings
set value = value || jsonb_build_object(
  'editions', '41a88240-6886-810e-b619-000bcfb7203e',
  'productions', '41a88240-6886-81ca-a0b3-000b842a644d',
  'openings', '41a88240-6886-81d8-90be-000b93894d55',
  'organizations', '41a88240-6886-81fb-9a05-000bc41d8281',
  'records', '41a88240-6886-8189-8917-000bfd06b8b6',
  'measures', '9210fd7b-1824-4c06-9c47-3fd8315db2bf'
)
where key = 'notion.data_sources'
  and value ? 'events';

-- The five measures for a month, counted from the site's own records,
-- never names: members and active members (at the month's end), events
-- held and check-ins, Qirtas pieces published, and staff hours confirmed.
create function private.society_measures(month_start date)
returns jsonb
language sql
stable security definer
set search_path to ''
as $$
  with bounds as (
    select (month_start::timestamp at time zone 'Asia/Baghdad') as from_at,
      ((month_start + interval '1 month')::timestamp at time zone 'Asia/Baghdad') as to_at
  )
  select jsonb_build_object(
    'members', (select count(*) from membership.memberships m, bounds b
      where m.created_at < b.to_at),
    'active_members', (select count(*) from membership.memberships m, bounds b
      where m.created_at < b.to_at
        and greatest(m.renewed_at, m.created_at) >= private.year_start()),
    'events', (select count(*) from events.events e, bounds b
      where e.status = 'published' and e.starts_at >= b.from_at and e.starts_at < b.to_at),
    'check_ins', (select count(*) from events.check_ins c
      join events.events e on e.id = c.event_id, bounds b
      where e.starts_at >= b.from_at and e.starts_at < b.to_at),
    'pieces', (select count(*) from journal.pieces p, bounds b
      where p.status = 'published' and p.published_at >= b.from_at and p.published_at < b.to_at),
    'staff_hours', (select coalesce(sum(r.hours), 0) from membership.service_records r, bounds b
      where r.status = 'confirmed'
        and r.occurred_on >= month_start and r.occurred_on < (month_start + interval '1 month')::date)
  );
$$;
revoke all on function private.society_measures(date) from public, anon, authenticated;
grant execute on function private.society_measures(date) to service_role;

-- The name the sync calls (the service role only).
create function core.society_measures(month_start date)
returns jsonb
language sql
stable
set search_path to ''
as $$ select private.society_measures($1) $$;
revoke all on function core.society_measures(date) from public, anon, authenticated;
grant execute on function core.society_measures(date) to service_role;
