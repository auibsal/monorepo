-- One register for every organization, and who an event is with
-- (decisions.md, Partners; Events).
--
-- 1. The register (governance.partners) holds partners, campus partners
--    (AUIB's own offices) and sponsors in kind, each with its relation, its
--    name in both languages, its logo, a one-line description and its
--    link. Partners still come only from applications; campus partners and
--    sponsors are added by Partnerships. Every entry is editable.
-- 2. The "With the support of" list (governance.supporters) becomes the
--    register's campus partners, keeping each entry.
-- 3. An event names the organizations it is with, picked from the register
--    (events.event_organizations): "Co-sponsored by" for partners and
--    campus partners, "Thanks to" for sponsors in kind. They replace the
--    sponsors worked out from the needs list.

-- ── 1. The register ─────────────────────────────────────────────────────
alter table governance.partners
  add column relation text not null default 'partner'
    check (relation in ('partner', 'campus', 'sponsor')),
  -- AUIB's standard logo set (apps/web/public/institutions), for the
  -- campus partners that use it; an uploaded logo (logo_path) wins.
  add column logo_static text
    check (logo_static in ('auib', 'student-life', 'cas', 'press', 'library')),
  add column logo_width integer check (logo_width between 100 and 2000),
  add constraint partners_static_logo check ((logo_static is null) = (logo_width is null));

comment on column governance.partners.relation is
  'partner (by application and memorandum), campus (an AUIB office) or sponsor (in kind) (decisions.md, Partners).';

create index partners_relation_idx on governance.partners (relation);

-- A partner edits its own profile; what it is, its standing, address and
-- listing stay the Society's.
create or replace function private.guard_partner_self_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Scheduled jobs and the Society's own functions run as other roles.
  if current_user <> 'authenticated' or (select private.has_permission('partners.manage')) then
    return new;
  end if;
  if new.slug is distinct from old.slug
    or new.status is distinct from old.status
    or new.is_listed is distinct from old.is_listed
    or new.lead_id is distinct from old.lead_id
    or new.notes is distinct from old.notes
    or new.kind is distinct from old.kind
    or new.reach is distinct from old.reach
    or new.relation is distinct from old.relation
    or new.logo_static is distinct from old.logo_static then
    raise exception 'kept_by_the_society' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── 2. "With the support of" becomes the campus partners ────────────────
insert into governance.partners (
  slug, name_en, name_ar, kind, reach, status, url, is_listed, relation,
  logo_static, logo_width
)
select
  case s.logo
    when 'auib' then 'auib'
    when 'student-life' then 'office-of-student-life'
    when 'cas' then 'college-of-arts-and-sciences'
    when 'press' then 'auib-press'
    when 'library' then 'auib-library'
    else btrim(regexp_replace(lower(s.name_en), '[^a-z0-9]+', '-', 'g'), '-')
  end,
  s.name_en, s.name_ar, 'department', 'auib', 'active', s.url, s.shown, 'campus',
  s.logo, s.logo_width
from governance.supporters s
on conflict (slug) do nothing;

drop table governance.supporters;

-- New entries (decisions.md, Partners): their logos are still to come, so
-- each shows its name alone until Partnerships adds one.
insert into governance.partners (slug, name_en, name_ar, kind, reach, status, is_listed, relation)
values
  ('the-american-space', 'The American Space', 'المساحة الأمريكية', 'cultural', 'auib', 'active', true, 'campus'),
  ('iraqi-independent-film-centre', 'Iraqi Independent Film Centre', 'المركز العراقي للفيلم المستقل',
    'cultural', 'iraq', 'active', true, 'sponsor')
on conflict (slug) do nothing;

-- The public partners page: the partners (a signed memorandum in force),
-- then the campus partners. Sponsors in kind appear only on their events.
drop function governance.public_partners();
drop function private.public_partners();

create function private.public_partners()
returns table (
  slug text, name_en text, name_ar text, kind text, reach text, url text,
  description_en text, description_ar text, logo_path text, relation text,
  logo_static text, logo_width integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.slug, p.name_en, p.name_ar, p.kind, p.reach, p.url,
    p.description_en, p.description_ar, p.logo_path, p.relation,
    p.logo_static, p.logo_width
  from governance.partners p
  where p.status = 'active'
    and p.is_listed
    and (
      p.relation = 'campus'
      or (p.relation = 'partner' and exists (
        select 1 from governance.partner_agreements a
        where a.partner_id = p.id
          and a.status = 'signed'
          and a.starts_on <= current_date
          and (a.ends_on is null or a.ends_on >= current_date)
      ))
    )
  order by p.name_en;
$$;
revoke all on function private.public_partners() from public;
grant execute on function private.public_partners() to anon, authenticated;

create function governance.public_partners()
returns table (
  slug text, name_en text, name_ar text, kind text, reach text, url text,
  description_en text, description_ar text, logo_path text, relation text,
  logo_static text, logo_width integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.public_partners() $$;
revoke all on function governance.public_partners() from public;
grant execute on function governance.public_partners() to anon, authenticated;

-- The register's names, for the pickers: what each entry is, too.
drop function governance.partner_names();
drop function private.partner_names();

create function private.partner_names()
returns table (id uuid, name_en text, name_ar text, kind text, relation text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name_en, coalesce(p.name_ar, p.name_en), p.kind, p.relation
  from governance.partners p
  where (private.membership_is_member() and p.status in ('active', 'prospect'))
    or exists (
      select 1 from governance.partner_affiliations a
      where a.partner_id = p.id and a.user_id = (select auth.uid()) and a.status = 'verified'
    )
  order by p.name_en;
$$;
create function governance.partner_names()
returns table (id uuid, name_en text, name_ar text, kind text, relation text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.partner_names() $$;

revoke all on function private.partner_names(), governance.partner_names() from public, anon;
grant execute on function private.partner_names(), governance.partner_names()
  to authenticated, service_role;

-- ── 3. Who an event is with ─────────────────────────────────────────────
create table events.event_organizations (
  event_id uuid not null references events.events (id) on delete cascade,
  partner_id uuid not null references governance.partners (id) on delete cascade,
  -- "Co-sponsored by" (partners and campus partners) or "Thanks to"
  -- (sponsors in kind).
  line text not null check (line in ('cosponsor', 'thanks')),
  created_at timestamptz not null default now(),
  primary key (event_id, partner_id)
);
create index event_organizations_partner_idx on events.event_organizations (partner_id);

comment on table events.event_organizations is
  'The organizations an event is with, picked from the register (decisions.md, Events): co-sponsors and sponsors in kind.';

-- The line follows what the organization is.
create function private.event_organization_line()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind text;
begin
  select p.relation into kind from governance.partners p where p.id = new.partner_id;
  if (new.line = 'cosponsor' and kind not in ('partner', 'campus'))
     or (new.line = 'thanks' and kind <> 'sponsor') then
    raise exception 'wrong_line' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.event_organization_line() from public, anon, authenticated;

create trigger event_organization_line before insert or update on events.event_organizations
  for each row execute function private.event_organization_line();

alter table events.event_organizations enable row level security;

create policy "No third-party apps" on events.event_organizations
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

-- Read with the event (the events' own policies decide who sees it).
create policy "Read with the event" on events.event_organizations
  for select to anon, authenticated
  using (exists (select 1 from events.events e where e.id = event_id));
create policy "The event's managers add organizations" on events.event_organizations
  for insert to authenticated
  with check ((select private.manages_event(event_id)));
create policy "The event's managers change organizations" on events.event_organizations
  for update to authenticated
  using ((select private.manages_event(event_id)))
  with check ((select private.manages_event(event_id)));
create policy "The event's managers remove organizations" on events.event_organizations
  for delete to authenticated
  using ((select private.manages_event(event_id)));

grant select on events.event_organizations to anon, authenticated;
grant insert, update, delete on events.event_organizations to authenticated;
grant all on events.event_organizations to service_role;

create trigger revalidate after insert or update or delete on events.event_organizations
  for each statement execute function private.queue_revalidation('events');

create trigger log_activity after insert or update or delete on events.event_organizations
  for each row execute function private.log_activity();

-- The event page's foot: the listed organizations, by line and name.
drop function events.event_sponsors(text);
drop function private.event_sponsors(text);

create function private.event_organizations(event_slug text)
returns table (
  line text, name_en text, name_ar text, slug text, url text,
  logo_path text, logo_static text, logo_width integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.line, p.name_en, p.name_ar, p.slug, p.url, p.logo_path,
    p.logo_static, p.logo_width
  from events.events e
  join events.event_organizations o on o.event_id = e.id
  join governance.partners p on p.id = o.partner_id
  where e.slug = event_slug
    and e.status in ('published', 'canceled')
    and not e.members_only
    and p.status = 'active'
    and p.is_listed
  order by o.line, p.name_en;
$$;
revoke all on function private.event_organizations(text) from public;
grant execute on function private.event_organizations(text) to anon, authenticated;

create function events.event_organizations(event_slug text)
returns table (
  line text, name_en text, name_ar text, slug text, url text,
  logo_path text, logo_static text, logo_width integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.event_organizations(event_slug) $$;
revoke all on function events.event_organizations(text) from public;
grant execute on function events.event_organizations(text) to anon, authenticated;

-- The screening on Sun Nov 22 (decisions.md, Events): co-sponsored by the
-- Office of Student Life and the American Space, with thanks to the Iraqi
-- Independent Film Centre.
insert into events.event_organizations (event_id, partner_id, line)
select e.id, p.id, x.line
from (values
  ('office-of-student-life', 'cosponsor'),
  ('the-american-space', 'cosponsor'),
  ('iraqi-independent-film-centre', 'thanks')
) as x (slug, line)
join governance.partners p on p.slug = x.slug
join events.events e on e.slug = 'iraqi-short-films-screening-2026-11-22'
on conflict do nothing;
