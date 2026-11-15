-- A partner's logo (decisions.md, Partners). An organization that applied
-- supplies its own logo from its dashboard; Partnerships approves it before
-- it shows, and can still upload or fix one itself. The entries the
-- Society adds itself (campus partners, sponsors in kind) take their logo
-- from Partnerships only. The Desk counts those still without a logo and
-- the logos waiting for approval, never an applicant's.

alter table governance.partners
  add column logo_pending_path text
    check (logo_pending_path like 'partners/pending/%'),
  add column logo_pending_at timestamptz;

comment on column governance.partners.logo_pending_path is
  'A logo the partner''s team sent from its dashboard (/api/partners/logo), waiting for Partnerships to approve; logo_path is the one shown.';

create index partners_logo_pending_idx on governance.partners (logo_pending_at)
  where logo_pending_path is not null;

-- The partner edits its own profile; its standing, address, listing and
-- the logo that shows stay the Society's (it proposes one instead).
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
    or new.logo_static is distinct from old.logo_static
    or new.logo_path is distinct from old.logo_path
    or new.logo_pending_path is distinct from old.logo_pending_path
    or new.logo_pending_at is distinct from old.logo_pending_at then
    raise exception 'kept_by_the_society' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- The partner's team proposes a logo (the file already uploaded by the API
-- route, under partners/pending/<partner id>/).
create function private.propose_partner_logo(partner uuid, path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('partners.own', 'partner', partner)
    or private.has_permission('partners.manage')) then
    raise exception 'not_your_partner' using errcode = '42501';
  end if;
  if path not like 'partners/pending/' || partner::text || '/%' then
    raise exception 'invalid_path' using errcode = '22023';
  end if;
  update governance.partners
  set logo_pending_path = path, logo_pending_at = now()
  where id = partner and relation = 'partner' and status <> 'ended';
  if not found then
    raise exception 'not_your_partner' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.propose_partner_logo(uuid, text) from public, anon;
grant execute on function private.propose_partner_logo(uuid, text) to authenticated;

create function governance.propose_partner_logo(partner uuid, path text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.propose_partner_logo(partner, path) $$;
revoke all on function governance.propose_partner_logo(uuid, text) from public, anon;
grant execute on function governance.propose_partner_logo(uuid, text) to authenticated;

-- Partnerships approves the proposed logo (it becomes the one shown) or
-- declines it (the partner sends another). Returns a declined file's
-- path, for the page to remove.
create function private.decide_partner_logo(partner uuid, approve boolean)
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
revoke all on function private.decide_partner_logo(uuid, boolean) from public, anon;
grant execute on function private.decide_partner_logo(uuid, boolean) to authenticated;

create function governance.decide_partner_logo(partner uuid, approve boolean)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.decide_partner_logo(partner, approve) $$;
revoke all on function governance.decide_partner_logo(uuid, boolean) from public, anon;
grant execute on function governance.decide_partner_logo(uuid, boolean) to authenticated;
