-- An organization's own email domain (decisions.md, Partners).
--
-- 1. An organization's address: a sign-in at a domain that isn't a common
--    personal provider (Gmail, Outlook…) or AUIB's own is an
--    organization's. Today then suggests applying as a partner, or, where
--    a partner has opened its domain, asking to join that partner's team.
-- 2. A partner's domain: the Partner Lead may let people at the Lead's own
--    organization domain ask to join the team. Nobody joins without the
--    Lead: each request is approved or declined on the dashboard's Team
--    tab, and the team stays at the Lead and two more.
-- 3. A guest who joins a partner's team, or whose partnership the Council
--    approves, becomes that partner's person: an account is one kind (one
--    membership), so the guest record ends then.

-- ── 1. An organization's address ────────────────────────────────────────
create function private.organization_domain(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d is null or d = '' or d !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' then null
    when d = 'auib.edu.iq' or d like '%.auib.edu.iq' then null
    when d = any (array[
      'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.sa', 'hotmail.com',
      'hotmail.co.uk', 'hotmail.fr', 'live.com', 'msn.com', 'yahoo.com',
      'yahoo.co.uk', 'yahoo.fr', 'ymail.com', 'rocketmail.com', 'icloud.com',
      'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me',
      'gmx.com', 'gmx.de', 'gmx.net', 'mail.com', 'mail.ru', 'yandex.com',
      'yandex.ru', 'zoho.com', 'zohomail.com', 'fastmail.com', 'hey.com',
      'tutanota.com', 'tuta.io', 'qq.com', '163.com', '126.com', 'web.de',
      'inbox.com', 'aim.com'
    ]) then null
    else d
  end
  from (select lower(btrim(split_part(email, '@', 2))) as d) s
  where position('@' in coalesce(email, '')) > 0;
$$;
revoke all on function private.organization_domain(text) from public, anon;
-- Reads only the text it is given; the partners table's check calls it.
grant execute on function private.organization_domain(text) to authenticated;

-- ── 2. A partner's domain ───────────────────────────────────────────────
alter table governance.partners
  add column team_domain text
    check (team_domain is null or private.organization_domain('x@' || team_domain) = team_domain);
create unique index partners_team_domain_key on governance.partners (team_domain);
comment on column governance.partners.team_domain is
  'The organization domain whose people may ask to join the partner''s team (the Lead''s own; set only by private.set_partner_team_domain). Null: invitations only.';

-- Leads this partner now.
create function private.leads_partner(uid uuid, partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from access.role_assignments r
    where r.user_id = uid and r.role = 'partner_lead'
      and r.scope_type = 'partner' and r.scope_id = partner
      and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  );
$$;
revoke all on function private.leads_partner(uuid, uuid) from public, anon, authenticated;

-- The Lead and two more (decisions.md, Partners).
create function private.partner_team_size(partner uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct r.user_id)::integer from access.role_assignments r
  where r.role in ('partner_rep', 'partner_lead') and r.scope_type = 'partner'
    and r.scope_id = partner and r.starts_at <= now()
    and (r.ends_at is null or r.ends_at > now());
$$;
revoke all on function private.partner_team_size(uuid) from public, anon, authenticated;

create table governance.partner_join_requests (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references governance.partners (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);
comment on table governance.partner_join_requests is
  'Someone at a partner''s domain asks to join its team; a Partner Lead approves or declines (decisions.md, Partners). Written only by the functions below.';
create unique index partner_join_requests_one_pending
  on governance.partner_join_requests (user_id) where status = 'pending';
create index partner_join_requests_partner_idx on governance.partner_join_requests (partner_id, status);
create index partner_join_requests_user_idx on governance.partner_join_requests (user_id);
create index partner_join_requests_decided_by_idx on governance.partner_join_requests (decided_by);

alter table governance.partner_join_requests enable row level security;
grant select on governance.partner_join_requests to authenticated;

create policy "The person and the partner's Lead read requests" on governance.partner_join_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.leads_partner((select auth.uid()), partner_id)
  );

create policy "No third-party apps" on governance.partner_join_requests
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

-- The Lead opens the team to the Lead's own organization domain, or closes it.
create function private.set_partner_team_domain(partner uuid, open boolean)
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
  if exists (
    select 1 from governance.partners p where p.team_domain = domain and p.id <> partner
  ) then
    raise exception 'domain_taken' using errcode = '23505';
  end if;
  update governance.partners set team_domain = domain where id = partner;
  return domain;
end;
$$;
revoke all on function private.set_partner_team_domain(uuid, boolean) from public, anon;
grant execute on function private.set_partner_team_domain(uuid, boolean) to authenticated;

create function governance.set_partner_team_domain(partner uuid, open boolean)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.set_partner_team_domain($1, $2) $$;
revoke all on function governance.set_partner_team_domain(uuid, boolean) from public, anon;
grant execute on function governance.set_partner_team_domain(uuid, boolean) to authenticated;

-- For the Lead's Team tab: the domain open now, and the one the Lead could open.
create function private.partner_team_domain(partner uuid)
returns table (team_domain text, lead_domain text)
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
  select p.team_domain,
    (select private.organization_domain(u.email) from auth.users u
     where u.id = uid and u.email_confirmed_at is not null)
  from governance.partners p where p.id = partner;
end;
$$;
revoke all on function private.partner_team_domain(uuid) from public, anon;
grant execute on function private.partner_team_domain(uuid) to authenticated;

create function governance.partner_team_domain(partner uuid)
returns table (team_domain text, lead_domain text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_team_domain($1) $$;
revoke all on function governance.partner_team_domain(uuid) from public, anon;
grant execute on function governance.partner_team_domain(uuid) to authenticated;

-- May this account be on a partner's team? Not a member's (a member leads
-- a club's partnership by applying), not already on a team, and not a
-- partner's guest (whose partner vouched for them as a guest).
create function private.may_join_partner_team(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not private.is_member(uid)
    and not private.is_partner_team(uid)
    and not exists (
      select 1 from governance.partner_affiliations f
      where f.user_id = uid and f.status = 'verified'
    );
$$;
revoke all on function private.may_join_partner_team(uuid) from public, anon, authenticated;

-- What Today shows: the person's organization domain, and the partner that
-- opened it, with the person's request, if any, and whether they have
-- applied as a partner already.
create function private.my_organization()
returns table (
  domain text,
  partner_id uuid,
  partner_name_en text,
  partner_name_ar text,
  request_status text,
  applied boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  mine text;
begin
  select private.organization_domain(u.email) into mine
  from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if mine is null or private.is_member(uid) or private.is_partner_team(uid) then
    return;
  end if;
  return query
  select mine, p.id, p.name_en, p.name_ar,
    (select r.status from governance.partner_join_requests r
     where r.user_id = uid and r.partner_id = p.id
     order by r.created_at desc limit 1),
    exists (select 1 from governance.partner_agreements a where a.applied_by = uid)
  from (select 1) one
  left join governance.partners p
    on p.team_domain = mine and p.status = 'active'
    and private.may_join_partner_team(uid);
end;
$$;
revoke all on function private.my_organization() from public, anon;
grant execute on function private.my_organization() to authenticated;

create function core.my_organization()
returns table (
  domain text,
  partner_id uuid,
  partner_name_en text,
  partner_name_ar text,
  request_status text,
  applied boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_organization() $$;
revoke all on function core.my_organization() from public, anon;
grant execute on function core.my_organization() to authenticated;

-- Ask to join the partner whose domain is the person's own.
create function private.ask_to_join_partner(partner uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  request uuid;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from governance.partners p
    join auth.users u on u.id = uid
    where p.id = partner and p.status = 'active' and p.team_domain is not null
      and u.email_confirmed_at is not null
      and private.organization_domain(u.email) = p.team_domain
  ) then
    raise exception 'not_your_domain' using errcode = '42501';
  end if;
  if not private.may_join_partner_team(uid) then
    raise exception 'one_membership' using errcode = '42501';
  end if;
  if private.partner_team_size(partner) >= 3 then
    raise exception 'team_full' using errcode = '22023';
  end if;
  if exists (
    select 1 from governance.partner_join_requests r
    where r.user_id = uid and r.status = 'pending'
  ) then
    raise exception 'already_asked' using errcode = '23505';
  end if;
  insert into governance.partner_join_requests (partner_id, user_id)
  values (partner, uid)
  returning id into request;
  perform private.enqueue('partners.join_requested', jsonb_build_object(
    'request_id', request, 'partner_id', partner, 'user_id', uid
  ));
  return request;
end;
$$;
revoke all on function private.ask_to_join_partner(uuid) from public, anon;
grant execute on function private.ask_to_join_partner(uuid) to authenticated;

create function governance.ask_to_join_partner(partner uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.ask_to_join_partner($1) $$;
revoke all on function governance.ask_to_join_partner(uuid) from public, anon;
grant execute on function governance.ask_to_join_partner(uuid) to authenticated;

create function private.withdraw_partner_join_request()
returns void
language sql
security definer
set search_path = ''
as $$
  update governance.partner_join_requests set status = 'withdrawn', decided_at = now()
  where user_id = (select auth.uid()) and status = 'pending';
$$;
revoke all on function private.withdraw_partner_join_request() from public, anon;
grant execute on function private.withdraw_partner_join_request() to authenticated;

create function governance.withdraw_partner_join_request()
returns void
language sql
security invoker
set search_path = ''
as $$ select private.withdraw_partner_join_request() $$;
revoke all on function governance.withdraw_partner_join_request() from public, anon;
grant execute on function governance.withdraw_partner_join_request() to authenticated;

-- The Lead's list: who asks, by name and address.
create function private.partner_join_requests(partner uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name_en text,
  full_name_ar text,
  email text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.leads_partner((select auth.uid()), partner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select r.id, r.user_id, p.full_name_en, p.full_name_ar, u.email::text, r.created_at
  from governance.partner_join_requests r
  join auth.users u on u.id = r.user_id
  left join core.profiles p on p.id = r.user_id
  where r.partner_id = partner and r.status = 'pending'
  order by r.created_at;
end;
$$;
revoke all on function private.partner_join_requests(uuid) from public, anon;
grant execute on function private.partner_join_requests(uuid) to authenticated;

create function governance.partner_join_requests(partner uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name_en text,
  full_name_ar text,
  email text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_join_requests($1) $$;
revoke all on function governance.partner_join_requests(uuid) from public, anon;
grant execute on function governance.partner_join_requests(uuid) to authenticated;

-- The Lead approves (the person joins the team) or declines.
create function private.decide_partner_join_request(request uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r governance.partner_join_requests;
begin
  select * into r from governance.partner_join_requests j
  where j.id = request for update;
  if not found or not private.leads_partner(uid, r.partner_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'already_decided' using errcode = '22023';
  end if;
  if coalesce(approve, false) then
    if not private.may_join_partner_team(r.user_id) then
      raise exception 'one_membership' using errcode = '42501';
    end if;
    if private.partner_team_size(r.partner_id) >= 3 then
      raise exception 'team_full' using errcode = '22023';
    end if;
    insert into access.role_assignments (user_id, role, scope_type, scope_id, assigned_by)
    values (r.user_id, 'partner_rep', 'partner', r.partner_id, uid);
  end if;
  update governance.partner_join_requests set
    status = case when coalesce(approve, false) then 'approved' else 'declined' end,
    decided_at = now(),
    decided_by = uid
  where id = r.id;
  perform private.enqueue('partners.join_decided', jsonb_build_object(
    'request_id', r.id, 'partner_id', r.partner_id, 'user_id', r.user_id,
    'approved', coalesce(approve, false)
  ));
end;
$$;
revoke all on function private.decide_partner_join_request(uuid, boolean) from public, anon;
grant execute on function private.decide_partner_join_request(uuid, boolean) to authenticated;

create function governance.decide_partner_join_request(request uuid, approve boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.decide_partner_join_request($1, $2) $$;
revoke all on function governance.decide_partner_join_request(uuid, boolean) from public, anon;
grant execute on function governance.decide_partner_join_request(uuid, boolean) to authenticated;

-- ── 3. A guest becomes a partner's person ───────────────────────────────
-- Before one_membership (which refuses a partner's role on a guest's
-- account), the Society's guest record ends: the approval (the Council's
-- vote, the Lead's yes) is the word for it. A partner's verified guest
-- stays one, and one_membership still refuses the role.
create function private.guest_joins_partner_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role in ('partner_rep', 'partner_lead')
     and (new.ends_at is null or new.ends_at > now()) then
    update membership.guests set ended_at = now()
    where user_id = new.user_id and (ended_at is null or ended_at > now());
  end if;
  return new;
end;
$$;
revoke all on function private.guest_joins_partner_team() from public, anon, authenticated;

create trigger guest_joins_partner_team
  before insert on access.role_assignments
  for each row execute function private.guest_joins_partner_team();
