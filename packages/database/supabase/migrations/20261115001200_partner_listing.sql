-- A partner owns its listing; the Diwan shows what the public sees
-- (decisions.md, Partners; The site; Brand).
--
-- 1. A partner's own entry (one that applied: an application or a Partner
--    Lead) belongs to the partner. Its description, link and people are the
--    partner's, and the partner's changes wait for the Director of
--    Partnerships (approve or decline, before and after side by side). Its
--    name is locked to the memorandum. The Society changes only its logo
--    (logged, and the Lead is told), its kind and its listing. The Lead's
--    and the team's contacts come from their accounts, never typed.
--    The entries the Society added (campus partners, sponsors) stay fully
--    editable.
-- 2. Linking: when an organization applies and the register already has
--    it, the Director of Partnerships chooses "Same organization as…" or
--    "New entry"; linking keeps the entry's history and events.
-- 3. Shared domains (a university's, a school's, a government's) never
--    open a team to its domain: named invitations only.
-- 4. Logos: "The logo shows the name" (on by default), a logo for dark
--    backgrounds, and the American Space in AUIB's standard set.
-- 5. The Iraqi Independent Film Center, as its own logo spells it.
-- 6. The Register shows each person's short name in both languages and
--    their card number.

-- ── 1. Whose entry ──────────────────────────────────────────────────────
create function private.partner_owned(partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from governance.partners p
    where p.id = partner and p.relation = 'partner'
      and (
        exists (select 1 from governance.partner_agreements a
                where a.partner_id = p.id and a.applied_by is not null)
        or exists (select 1 from access.role_assignments r
                   where r.role = 'partner_lead' and r.scope_type = 'partner'
                     and r.scope_id = p.id)
      )
  );
$$;
revoke all on function private.partner_owned(uuid) from public, anon;
grant execute on function private.partner_owned(uuid) to authenticated;

-- ── 4. Logo columns (before the guard reads them) ───────────────────────
alter table governance.partners
  add column logo_shows_name boolean not null default true,
  add column link_decided_at timestamptz;

comment on column governance.partners.logo_shows_name is
  '"The logo shows the name": the logo stands alone, the name its alt text and link label; off, or with no logo, the name shows in text (decisions.md, Events).';
comment on column governance.partners.link_decided_at is
  'When the Director of Partnerships chose "New entry" for an application the register seemed to have already (decisions.md, Partners: Linking).';

alter table governance.partners drop constraint partners_logo_static_check;
alter table governance.partners add constraint partners_logo_static_check
  check (logo_static = any (array['auib', 'student-life', 'cas', 'press', 'library', 'american-space']));
-- AUIB's lockups are 325 high; the width follows, to a tenth.
alter table governance.partners alter column logo_width type numeric(6, 1);

-- ── 1. Who changes what ─────────────────────────────────────────────────
create or replace function private.guard_partner_self_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Scheduled jobs and the Society's own functions run as other roles.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if (select private.has_permission('partners.manage')) then
    -- A partner's own entry: the Society keeps the logo, the kind and the
    -- listing (and its own records about it); the rest is the partner's.
    if private.partner_owned(old.id) and (
      new.name_en is distinct from old.name_en
      or new.name_ar is distinct from old.name_ar
      or new.description_en is distinct from old.description_en
      or new.description_ar is distinct from old.description_ar
      or new.url is distinct from old.url
      or new.contact_name is distinct from old.contact_name
      or new.contact_role is distinct from old.contact_role
      or new.contact_email is distinct from old.contact_email
    ) then
      raise exception 'the_partners_own' using errcode = '42501';
    end if;
    return new;
  end if;
  -- The partner's team changes nothing here directly: its listing goes
  -- through governance.propose_partner_listing, its logo through
  -- governance.propose_partner_logo, its domain through its function.
  if row(new.*) is distinct from row(old.*) then
    raise exception 'kept_by_the_society' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- The contacts on a partner's own entry come from its people's accounts.
-- A contact typed before the partner had a Lead stays as the Society's
-- internal note (staff only, never listed) until a Lead signs up; then it
-- is dropped (private.drop_typed_contact, below).
create function private.partner_has_lead(partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from access.role_assignments r
               where r.role = 'partner_lead' and r.scope_type = 'partner' and r.scope_id = partner);
$$;
revoke all on function private.partner_has_lead(uuid) from public, anon;
grant execute on function private.partner_has_lead(uuid) to authenticated;

update governance.partners p
set contact_name = null, contact_role = null, contact_email = null
where private.partner_owned(p.id) and private.partner_has_lead(p.id);

create function private.drop_typed_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'partner_lead' and new.scope_type = 'partner' then
    update governance.partners
    set contact_name = null, contact_role = null, contact_email = null
    where id = new.scope_id
      and (contact_name is not null or contact_role is not null or contact_email is not null);
  end if;
  return new;
end;
$$;
revoke all on function private.drop_typed_contact() from public, anon, authenticated;

create trigger drop_typed_contact after insert on access.role_assignments
  for each row execute function private.drop_typed_contact();

-- The partner's people, from their accounts: the applicant and the team.
create function private.partner_people(partner uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, email text, role text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('partners.manage')
    or private.has_permission('partners.own', 'partner', partner)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  with people as (
    select r.user_id, r.role from access.role_assignments r
    where r.scope_type = 'partner' and r.scope_id = partner
      and r.role in ('partner_lead', 'partner_rep')
      and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
    union
    select a.applied_by, 'applicant' from governance.partner_agreements a
    where a.partner_id = partner and a.applied_by is not null
      and not exists (
        select 1 from access.role_assignments r
        where r.user_id = a.applied_by and r.scope_type = 'partner'
          and r.scope_id = partner and r.role in ('partner_lead', 'partner_rep')
      )
  )
  select distinct on (pe.user_id) pe.user_id,
    private.display_name(pr, 'en'), private.display_name(pr, 'ar'),
    u.email::text, pe.role
  from people pe
  join core.profiles pr on pr.id = pe.user_id
  join auth.users u on u.id = pe.user_id
  order by pe.user_id, pe.role;
end;
$$;
revoke all on function private.partner_people(uuid) from public, anon;
grant execute on function private.partner_people(uuid) to authenticated;

create function governance.partner_people(partner uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, email text, role text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_people(partner) $$;
revoke all on function governance.partner_people(uuid) from public, anon;
grant execute on function governance.partner_people(uuid) to authenticated;

create function governance.partner_owned(partner uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.partner_owned(partner) $$;
revoke all on function governance.partner_owned(uuid) from public, anon;
grant execute on function governance.partner_owned(uuid) to authenticated;

-- ── 1. The partner's changes, waiting for the Director of Partnerships ──
create table governance.partner_listing_changes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references governance.partners (id) on delete cascade,
  description_en text check (char_length(description_en) <= 1000),
  description_ar text check (char_length(description_ar) <= 1000),
  url text check (url ~ '^https://'),
  proposed_by uuid references auth.users (id) on delete set null,
  proposed_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz
);

comment on table governance.partner_listing_changes is
  'A partner''s change to its own listing (description and link), waiting for the Director of Partnerships; written only by the functions below.';

create unique index partner_listing_changes_one_pending
  on governance.partner_listing_changes (partner_id) where status = 'pending';
create index partner_listing_changes_partner_idx
  on governance.partner_listing_changes (partner_id, proposed_at desc);
create index partner_listing_changes_proposed_by_idx
  on governance.partner_listing_changes (proposed_by);
create index partner_listing_changes_decided_by_idx
  on governance.partner_listing_changes (decided_by);

alter table governance.partner_listing_changes enable row level security;
revoke all on governance.partner_listing_changes from anon, authenticated;
grant select on governance.partner_listing_changes to authenticated;
grant all on governance.partner_listing_changes to service_role;

create policy "No third-party apps" on governance.partner_listing_changes
  as restrictive for all to authenticated
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

create policy "Partnerships and the partner read its changes" on governance.partner_listing_changes
  for select to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  );

create function private.propose_partner_listing(partner uuid,
  description_en text, description_ar text, url text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  change uuid;
begin
  if not private.has_permission('partners.own', 'partner', partner) then
    raise exception 'not_your_partner' using errcode = '42501';
  end if;
  delete from governance.partner_listing_changes c
  where c.partner_id = partner and c.status = 'pending';
  insert into governance.partner_listing_changes
    (partner_id, description_en, description_ar, url, proposed_by)
  values (partner, nullif(btrim(description_en), ''), nullif(btrim(description_ar), ''),
    nullif(btrim(url), ''), (select auth.uid()))
  returning id into change;
  return change;
end;
$$;
revoke all on function private.propose_partner_listing(uuid, text, text, text) from public, anon;
grant execute on function private.propose_partner_listing(uuid, text, text, text) to authenticated;

create function governance.propose_partner_listing(partner uuid,
  description_en text, description_ar text, url text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.propose_partner_listing(partner, description_en, description_ar, url) $$;
revoke all on function governance.propose_partner_listing(uuid, text, text, text) from public, anon;
grant execute on function governance.propose_partner_listing(uuid, text, text, text) to authenticated;

create function private.decide_partner_listing(change uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c governance.partner_listing_changes;
begin
  if not private.has_permission('partners.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into c from governance.partner_listing_changes x
  where x.id = change and x.status = 'pending' for update;
  if c.id is null then
    raise exception 'no_pending_change' using errcode = '22023';
  end if;
  if approve then
    update governance.partners
    set description_en = c.description_en, description_ar = c.description_ar,
      url = c.url
    where id = c.partner_id;
  end if;
  update governance.partner_listing_changes
  set status = case when approve then 'approved' else 'declined' end,
    decided_by = (select auth.uid()), decided_at = now()
  where id = c.id;
end;
$$;
revoke all on function private.decide_partner_listing(uuid, boolean) from public, anon;
grant execute on function private.decide_partner_listing(uuid, boolean) to authenticated;

create function governance.decide_partner_listing(change uuid, approve boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.decide_partner_listing(change, approve) $$;
revoke all on function governance.decide_partner_listing(uuid, boolean) from public, anon;
grant execute on function governance.decide_partner_listing(uuid, boolean) to authenticated;

-- ── 1. A logo the Society changes on a partner's own entry ──────────────
-- Logged (the register's history) and the Lead is told. Approving the
-- partner's own logo is the partner's change, not the Society's.
create function private.partner_logo_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A person at the Society (inside a security-definer trigger the
  -- current user is the owner, so ask who is signed in).
  if (select auth.uid()) is not null
    and private.has_permission('partners.manage')
    and coalesce(current_setting('sal.partner_logo_approval', true), '') <> 'on'
    and (new.logo_path is distinct from old.logo_path
      or new.logo_shows_name is distinct from old.logo_shows_name)
    and private.partner_owned(new.id) then
    perform private.enqueue('partners.logo_changed',
      jsonb_build_object('partner_id', new.id));
  end if;
  return new;
end;
$$;
revoke all on function private.partner_logo_changed() from public, anon, authenticated;

create trigger partner_logo_changed after update on governance.partners
  for each row execute function private.partner_logo_changed();

create or replace function private.decide_partner_logo(partner uuid, approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending text;
begin
  if not private.has_permission('partners.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select p.logo_pending_path into pending
  from governance.partners p where p.id = partner for update;
  if pending is null then
    raise exception 'no_pending_logo' using errcode = '22023';
  end if;
  perform set_config('sal.partner_logo_approval', 'on', true);
  if approve then
    update governance.partners
    set logo_path = pending, logo_pending_path = null, logo_pending_at = null
    where id = partner;
    return null;
  end if;
  update governance.partners
  set logo_pending_path = null, logo_pending_at = null
  where id = partner;
  return pending;
end;
$$;

-- ── 2. Linking an application to the entry the register already has ────
create function private.domain_of_url(url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(lower(regexp_replace(
    regexp_replace(coalesce(url, ''), '^https?://(www\.)?', ''), '[/:?#].*$', '')), '');
$$;
revoke all on function private.domain_of_url(text) from public;

create function private.partner_matches(partner uuid)
returns table (id uuid, slug text, name_en text, name_ar text, relation text, by_domain boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  app governance.partners;
  domains text[];
begin
  if not private.has_permission('partners.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into app from governance.partners p where p.id = partner;
  if app.id is null or app.link_decided_at is not null then
    return;
  end if;
  select array_agg(distinct d) into domains from (
    select private.organization_domain(u.email) as d
    from governance.partner_agreements a
    join auth.users u on u.id = a.applied_by
    where a.partner_id = partner
    union select private.domain_of_url(app.url)
    union select app.team_domain
  ) s where d is not null;
  return query
  select p.id, p.slug, p.name_en, coalesce(p.name_ar, p.name_en), p.relation,
    coalesce(private.domain_of_url(p.url) = any (domains)
      or p.team_domain = any (domains), false)
  from governance.partners p
  where p.id <> partner and p.status <> 'ended'
    and not private.partner_owned(p.id)
    and (
      lower(btrim(p.name_en)) = lower(btrim(app.name_en))
      or (p.name_ar is not null and p.name_ar = app.name_ar)
      or lower(p.name_en) like '%' || lower(btrim(app.name_en)) || '%'
      or lower(app.name_en) like '%' || lower(btrim(p.name_en)) || '%'
      or private.domain_of_url(p.url) = any (coalesce(domains, '{}'))
      or p.team_domain = any (coalesce(domains, '{}'))
    )
  order by p.name_en;
end;
$$;
revoke all on function private.partner_matches(uuid) from public, anon;
grant execute on function private.partner_matches(uuid) to authenticated;

create function governance.partner_matches(partner uuid)
returns table (id uuid, slug text, name_en text, name_ar text, relation text, by_domain boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_matches(partner) $$;
revoke all on function governance.partner_matches(uuid) from public, anon;
grant execute on function governance.partner_matches(uuid) to authenticated;

-- "Same organization as…": the application joins the existing entry, which
-- keeps its history and events and becomes the partner's own.
create function private.link_partner(application uuid, existing uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  app governance.partners;
  target governance.partners;
begin
  if not private.has_permission('partners.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into app from governance.partners p where p.id = application for update;
  select * into target from governance.partners p where p.id = existing for update;
  if app.id is null or target.id is null or app.id = target.id then
    raise exception 'no_such_entry' using errcode = '22023';
  end if;
  if private.partner_owned(target.id) then
    raise exception 'already_a_partners' using errcode = '22023';
  end if;
  -- A team is given on the Council's approval, through access.assign_role;
  -- an application that has one is past linking.
  if exists (select 1 from access.role_assignments r
             where r.scope_type = 'partner' and r.scope_id = app.id) then
    raise exception 'already_has_team' using errcode = '22023';
  end if;
  update governance.partner_agreements set partner_id = target.id where partner_id = app.id;
  update governance.partner_invitations set partner_id = target.id where partner_id = app.id;
  update governance.partner_join_requests set partner_id = target.id where partner_id = app.id;
  update governance.partner_listing_changes set partner_id = target.id where partner_id = app.id;
  update governance.conflict_items set partner_id = target.id where partner_id = app.id;
  update events.events set partner_id = target.id where partner_id = app.id;
  update journal.submissions set partner_id = target.id where partner_id = app.id;
  update programmes.production_credits set partner_id = target.id where partner_id = app.id;
  update programmes.needs set given_by = target.id where given_by = app.id;
  update governance.partner_affiliations f set partner_id = target.id
  where f.partner_id = app.id and not exists (
    select 1 from governance.partner_affiliations g
    where g.partner_id = target.id and g.user_id = f.user_id);
  update journal.call_partners c set partner_id = target.id
  where c.partner_id = app.id and not exists (
    select 1 from journal.call_partners d
    where d.partner_id = target.id and d.call_id = c.call_id);
  update events.event_organizations o set partner_id = target.id
  where o.partner_id = app.id and not exists (
    select 1 from events.event_organizations q
    where q.partner_id = target.id and q.event_id = o.event_id);
  delete from governance.partners where id = app.id;
  update governance.partners
  set relation = 'partner',
    kind = app.kind,
    kind_other = app.kind_other,
    reach = app.reach,
    description_en = coalesce(target.description_en, app.description_en),
    description_ar = coalesce(target.description_ar, app.description_ar),
    url = coalesce(target.url, app.url),
    team_domain = coalesce(target.team_domain, app.team_domain),
    logo_pending_path = coalesce(app.logo_pending_path, target.logo_pending_path),
    logo_pending_at = coalesce(app.logo_pending_at, target.logo_pending_at),
    contact_name = null, contact_role = null, contact_email = null,
    link_decided_at = now()
  where id = target.id;
  return target.slug;
end;
$$;
revoke all on function private.link_partner(uuid, uuid) from public, anon;
grant execute on function private.link_partner(uuid, uuid) to authenticated;

create function governance.link_partner(application uuid, existing uuid)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.link_partner(application, existing) $$;
revoke all on function governance.link_partner(uuid, uuid) from public, anon;
grant execute on function governance.link_partner(uuid, uuid) to authenticated;

-- "New entry": the application keeps its own entry; no more suggestions.
create function private.keep_partner_entry(application uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('partners.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update governance.partners set link_decided_at = now() where id = application;
end;
$$;
revoke all on function private.keep_partner_entry(uuid) from public, anon;
grant execute on function private.keep_partner_entry(uuid) to authenticated;

create function governance.keep_partner_entry(application uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.keep_partner_entry(application) $$;
revoke all on function governance.keep_partner_entry(uuid) from public, anon;
grant execute on function governance.keep_partner_entry(uuid) to authenticated;

-- ── 3. Shared domains ───────────────────────────────────────────────────
-- A university's (other than AUIB's), a school's or a government's domain
-- is many organizations' at once: named invitations only.
create function private.is_shared_domain(domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(lower(domain) ~ '(^|\.)(edu|gov|mil)(\.[a-z]{2})?$'
    or lower(domain) ~ '(^|\.)(ac|sch|k12)\.[a-z]{2,}$'
    or lower(domain) ~ '\.(sch|k12)\.', false);
$$;
revoke all on function private.is_shared_domain(text) from public;
grant execute on function private.is_shared_domain(text) to anon, authenticated, service_role;

update governance.partners set team_domain = null
where team_domain is not null and private.is_shared_domain(team_domain);

alter table governance.partners drop constraint partners_team_domain_check;
alter table governance.partners add constraint partners_team_domain_check
  check (team_domain is null or (
    private.organization_domain('x@' || team_domain) = team_domain
    and not private.is_shared_domain(team_domain)));

create or replace function private.set_partner_team_domain(partner uuid, open boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  domain text;
begin
  if not private.leads_partner(uid, partner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not coalesce(open, false) then
    update governance.partners set team_domain = null where id = partner;
    return null;
  end if;
  select private.organization_domain(u.email) into domain
  from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if domain is null then
    raise exception 'no_organization_domain' using errcode = '22023';
  end if;
  if private.is_shared_domain(domain) then
    raise exception 'shared_domain' using errcode = '22023';
  end if;
  if exists (
    select 1 from governance.partners p where p.team_domain = domain and p.id <> partner
  ) then
    raise exception 'domain_taken' using errcode = '23505';
  end if;
  update governance.partners set team_domain = domain where id = partner;
  return domain;
end;
$$;

drop function governance.partner_team_domain(uuid);
drop function private.partner_team_domain(uuid);

create function private.partner_team_domain(partner uuid)
returns table (team_domain text, lead_domain text, lead_domain_shared boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if not private.leads_partner(uid, partner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select p.team_domain, d.domain, coalesce(private.is_shared_domain(d.domain), false)
  from governance.partners p
  cross join lateral (
    select private.organization_domain(u.email) as domain from auth.users u
    where u.id = uid and u.email_confirmed_at is not null
  ) d
  where p.id = partner;
end;
$$;
revoke all on function private.partner_team_domain(uuid) from public, anon;
grant execute on function private.partner_team_domain(uuid) to authenticated;

create function governance.partner_team_domain(partner uuid)
returns table (team_domain text, lead_domain text, lead_domain_shared boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_team_domain($1) $$;
revoke all on function governance.partner_team_domain(uuid) from public, anon;
grant execute on function governance.partner_team_domain(uuid) to authenticated;

-- ── 4. The public listing reads the logo fields too ─────────────────────
drop function governance.public_partners();
drop function private.public_partners();

create function private.public_partners()
returns table (
  slug text, name_en text, name_ar text, kind text, reach text, url text,
  description_en text, description_ar text, logo_path text, relation text,
  logo_static text, logo_width numeric, logo_shows_name boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.slug, p.name_en, p.name_ar, p.kind, p.reach, p.url,
    p.description_en, p.description_ar, p.logo_path, p.relation,
    p.logo_static, p.logo_width, p.logo_shows_name
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
  logo_static text, logo_width numeric, logo_shows_name boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.public_partners() $$;
revoke all on function governance.public_partners() from public;
grant execute on function governance.public_partners() to anon, authenticated;

-- The event page's foot reads them too.
drop function events.event_organizations(text);
drop function private.event_organizations(text);

create function private.event_organizations(event_slug text)
returns table (
  line text, name_en text, name_ar text, slug text, url text,
  logo_path text, logo_static text, logo_width numeric,
  logo_shows_name boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.line, p.name_en, p.name_ar, p.slug, p.url, p.logo_path,
    p.logo_static, p.logo_width, p.logo_shows_name
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
  logo_path text, logo_static text, logo_width numeric,
  logo_shows_name boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.event_organizations(event_slug) $$;
revoke all on function events.event_organizations(text) from public;
grant execute on function events.event_organizations(text) to anon, authenticated;

-- The American Space joins AUIB's standard set (apps/web/public/institutions).
update governance.partners
set logo_static = 'american-space', logo_width = 777.9, logo_shows_name = true
where slug = 'american-space';

-- ── 5. The film center's name, as on its own materials ─────────────────
update governance.partners
set name_en = 'Iraqi Independent Film Center', slug = 'iraqi-independent-film-center'
where slug = 'iraqi-independent-film-centre';

-- ── 6. The Register: short names in both languages and the card number ─
drop function membership.register();
drop function private.register();

create function private.register()
returns table (
  user_id uuid, email text, full_name_en text, full_name_ar text,
  short_name_en text, short_name_ar text, card_number integer,
  tier membership.tier, member_since date, verified_at timestamptz,
  activities integer, voting_member boolean, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('members.register') then
    raise exception 'members.register is required' using errcode = '42501';
  end if;

  return query
  select
    p.id, u.email::text, p.full_name_en, p.full_name_ar,
    private.display_name(p, 'en'), private.display_name(p, 'ar'), c.number,
    m.tier, m.member_since, p.verified_at, private.activity_count(p.id),
    private.is_voting_member(p.id), p.created_at
  from core.profiles p
  join auth.users u on u.id = p.id
  left join membership.memberships m on m.user_id = p.id
  left join membership.cards c on c.user_id = p.id
  order by lower(p.full_name_en), p.created_at;
end;
$$;
revoke all on function private.register() from public, anon;
grant execute on function private.register() to authenticated;

create function membership.register()
returns table (
  user_id uuid, email text, full_name_en text, full_name_ar text,
  short_name_en text, short_name_ar text, card_number integer,
  tier membership.tier, member_since date, verified_at timestamptz,
  activities integer, voting_member boolean, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.register() $$;
revoke all on function membership.register() from public, anon;
grant execute on function membership.register() to authenticated;
