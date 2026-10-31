-- Partners, their teams and their guests (owner, Oct 31, 2026):
--
--   * Membership is for AUIB addresses only. A new account on an outside
--     address is refused unless it comes with a partner invitation or a
--     partner application. Members already on outside addresses (alumni
--     among them) stay members, and members still add a personal email.
--   * A partner's team: a Lead (partner_lead: the team, renewals) and Team
--     (partner_rep), six people at most, invited by email.
--   * A partner's guests join only through its invitations: by email
--     (verified on accepting) or by a shareable link (waiting for the
--     partner to verify them).
--   * Guests book places at events, and see partners' perks, like members.
--
-- Arabic names are needs-native-review (PROGRESS.md).

-- ── Lead and Team ───────────────────────────────────────────────────────────
insert into access.permissions (key, description) values
  ('partners.lead', 'Lead a partner''s team: invite and remove its people (scoped to the partner)');

insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('partner_lead', 'Partner Lead', 'مسؤول الشريك', false, 399);

insert into access.role_permissions (role, permission) values
  ('partner_lead', 'partners.own'),
  ('partner_lead', 'partners.lead');

create or replace function private.role_runs_for_the_year()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ends_at is null and new.role not in ('faculty_advisor', 'partner_rep', 'partner_lead') then
    new.ends_at := private.year_end();
  end if;
  return new;
end;
$$;

create or replace function access.officer_directory()
returns table (
  user_id uuid, email text, full_name_en text, full_name_ar text, roles text[],
  council boolean, term_starts timestamptz, term_ends timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.user_id,
    u.email::text,
    p.full_name_en,
    p.full_name_ar,
    array_agg(distinct r.name_en order by r.name_en),
    bool_or(r.is_council),
    min(a.starts_at),
    case when bool_or(a.ends_at is null) then null else max(a.ends_at) end
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join auth.users u on u.id = a.user_id
  left join core.profiles p on p.id = a.user_id
  where a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
    and a.role not in ('partner_rep', 'partner_lead')
  group by a.user_id, u.email, p.full_name_en, p.full_name_ar;
$$;

-- Whoever applied leads the partner once the Society signs. Earlier
-- representatives (the first partners, Oct 31) become its leads.
update access.role_assignments set role = 'partner_lead'
where role = 'partner_rep'
  and exists (
    select 1 from governance.partner_agreements a
    where a.partner_id = role_assignments.scope_id and a.applied_by = role_assignments.user_id
  );

create or replace function private.sign_partner_agreement(
  agreement_id uuid,
  partner_signatory text,
  signed_document_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a governance.partner_agreements;
  signatory text;
begin
  if not (select access.has_permission('partners.sign')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into a from governance.partner_agreements where id = agreement_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if a.status <> 'draft' then
    raise exception 'not_draft' using errcode = '22023';
  end if;
  if private.has_partner_conflict(auth.uid(), a.partner_id) then
    raise exception 'conflict_declared' using errcode = '42501';
  end if;
  signatory := coalesce(nullif(btrim(sign_partner_agreement.partner_signatory), ''), a.partner_signatory);
  if coalesce(btrim(signatory), '') = '' then
    raise exception 'missing_signature' using errcode = '22023';
  end if;
  if sign_partner_agreement.signed_document_path is not null
    and sign_partner_agreement.signed_document_path !~ '^partners/' then
    raise exception 'invalid_document' using errcode = '22023';
  end if;

  update governance.partner_agreements set
    status = 'signed',
    partner_signatory = left(signatory, 200),
    partner_signed_at = coalesce(a.partner_signed_at, now()),
    signed_document_path = coalesce(sign_partner_agreement.signed_document_path, a.signed_document_path),
    signed_by = auth.uid(),
    signed_at = now()
  where id = agreement_id;

  update governance.partners set status = 'active'
  where id = a.partner_id and status = 'prospect';

  if a.applied_by is not null and not exists (
    select 1 from access.role_assignments r
    where r.user_id = a.applied_by and r.role in ('partner_rep', 'partner_lead')
      and r.scope_type = 'partner' and r.scope_id = a.partner_id
      and (r.ends_at is null or r.ends_at > now())
  ) then
    insert into access.role_assignments (user_id, role, scope_type, scope_id, assigned_by)
    values (a.applied_by, 'partner_lead', 'partner', a.partner_id, auth.uid());
  end if;
end;
$$;

create or replace function private.can_lead_partner(partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select access.has_permission('partners.manage')
    or access.has_permission('partners.lead', 'partner', partner);
$$;
revoke all on function private.can_lead_partner(uuid) from public, anon;
grant execute on function private.can_lead_partner(uuid) to authenticated;

create or replace function private.my_partners()
returns table (id uuid, slug text, name_en text, name_ar text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.name_en, p.name_ar, p.status
  from governance.partners p
  where exists (
    select 1 from access.role_assignments r
    where r.user_id = (select auth.uid()) and r.role in ('partner_rep', 'partner_lead')
      and r.scope_type = 'partner' and r.scope_id = p.id
      and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  )
  order by p.name_en;
$$;

drop function governance.partner_team(uuid);
drop function private.partner_team(uuid);
create function private.partner_team(partner uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, email text, since timestamptz, lead boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_keep_partner(partner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select r.user_id, p.full_name_en, p.full_name_ar, u.email::text, min(r.starts_at),
    bool_or(r.role = 'partner_lead')
  from access.role_assignments r
  join auth.users u on u.id = r.user_id
  left join core.profiles p on p.id = r.user_id
  where r.role in ('partner_rep', 'partner_lead') and r.scope_type = 'partner' and r.scope_id = partner
    and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  group by r.user_id, p.full_name_en, p.full_name_ar, u.email
  order by bool_or(r.role = 'partner_lead') desc, min(r.starts_at);
end;
$$;
revoke all on function private.partner_team(uuid) from public, anon;
grant execute on function private.partner_team(uuid) to authenticated;

create function governance.partner_team(partner uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, email text, since timestamptz, lead boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_team($1) $$;
revoke all on function governance.partner_team(uuid) from public, anon;
grant execute on function governance.partner_team(uuid) to authenticated;

-- Teammates come by invitation now; adding an existing account by address
-- is gone.
drop function governance.add_partner_teammate(uuid, text);
drop function private.add_partner_teammate(uuid, text);

-- The Lead removes a teammate, or anyone leaves; a partner keeps a Lead.
create or replace function private.remove_partner_teammate(partner uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  leads integer;
  is_lead boolean;
begin
  if not (private.can_lead_partner(partner)
    or (member = (select auth.uid()) and private.can_keep_partner(partner))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select count(*) filter (where t.lead), coalesce(bool_or(t.lead) filter (where t.user_id = member), false)
  into leads, is_lead
  from private.partner_team(partner) t;
  if is_lead and leads <= 1 and not access.has_permission('partners.manage') then
    raise exception 'last_lead' using errcode = '22023';
  end if;
  delete from access.role_assignments
  where user_id = member and role in ('partner_rep', 'partner_lead') and scope_type = 'partner'
    and scope_id = partner and starts_at >= now();
  update access.role_assignments set ends_at = now()
  where user_id = member and role in ('partner_rep', 'partner_lead') and scope_type = 'partner'
    and scope_id = partner and (ends_at is null or ends_at > now());
end;
$$;

-- The Lead makes a teammate a Lead too, or Team again.
create function private.set_partner_lead(partner uuid, member uuid, lead boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  held text;
begin
  if not private.can_lead_partner(partner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select r.role into held from access.role_assignments r
  where r.user_id = member and r.role in ('partner_rep', 'partner_lead')
    and r.scope_type = 'partner' and r.scope_id = partner
    and (r.ends_at is null or r.ends_at > now())
  limit 1;
  if held is null then
    raise exception 'not_on_team' using errcode = 'P0002';
  end if;
  if not lead and held = 'partner_lead'
    and (select count(*) from private.partner_team(partner) t where t.lead) <= 1 then
    raise exception 'last_lead' using errcode = '22023';
  end if;
  if (held = 'partner_lead') = lead then
    return;
  end if;
  update access.role_assignments set role = case when lead then 'partner_lead' else 'partner_rep' end
  where user_id = member and role = held and scope_type = 'partner' and scope_id = partner
    and (ends_at is null or ends_at > now());
end;
$$;
revoke all on function private.set_partner_lead(uuid, uuid, boolean) from public, anon;
grant execute on function private.set_partner_lead(uuid, uuid, boolean) to authenticated;

create function governance.set_partner_lead(partner uuid, member uuid, lead boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_partner_lead($1, $2, $3) $$;
revoke all on function governance.set_partner_lead(uuid, uuid, boolean) from public, anon;
grant execute on function governance.set_partner_lead(uuid, uuid, boolean) to authenticated;

-- ── Invitations ─────────────────────────────────────────────────────────────
create table governance.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references governance.partners (id) on delete cascade,
  kind text not null check (kind in ('team', 'guest')),
  -- Set: one person, verified on accepting. Null: a shareable guest link,
  -- whose guests wait for the partner to verify them.
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+$'),
  code text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  check (kind = 'guest' or email is not null)
);

comment on table governance.partner_invitations is
  'How a partner''s team members and guests join (owner, Oct 31, 2026): an email invitation for one person, or a shareable guest link.';

create index partner_invitations_partner_id_idx on governance.partner_invitations (partner_id);
create index partner_invitations_created_by_idx on governance.partner_invitations (created_by);
create index partner_invitations_accepted_by_idx on governance.partner_invitations (accepted_by);

alter table governance.partner_invitations enable row level security;

-- Codes are always made here, never chosen by a client; a client only
-- names the partner, the kind and the address, and withdraws.
revoke all on governance.partner_invitations from anon, authenticated;
grant select on governance.partner_invitations to authenticated;
grant insert (partner_id, kind, email) on governance.partner_invitations to authenticated;
grant update (revoked_at) on governance.partner_invitations to authenticated;
grant all on governance.partner_invitations to service_role;

create policy "No third-party apps" on governance.partner_invitations
  as restrictive for all to authenticated
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

create policy "The partner and partnership managers read invitations" on governance.partner_invitations
  for select to authenticated
  using ((select private.can_keep_partner(partner_id)));

-- Team invitations are the Lead's; guest invitations any teammate's.
create policy "The partner invites" on governance.partner_invitations
  for insert to authenticated
  with check (
    accepted_by is null and accepted_at is null and revoked_at is null
    and case when kind = 'team' then (select private.can_lead_partner(partner_id))
      else (select private.can_keep_partner(partner_id)) end
    and exists (select 1 from governance.partners p where p.id = partner_id and p.status = 'active')
  );

create policy "The partner withdraws an invitation" on governance.partner_invitations
  for update to authenticated
  using (
    case when kind = 'team' then (select private.can_lead_partner(partner_id))
      else (select private.can_keep_partner(partner_id)) end
  )
  with check (
    case when kind = 'team' then (select private.can_lead_partner(partner_id))
      else (select private.can_keep_partner(partner_id)) end
  );

-- Only withdrawing: an invitation's address, partner and kind stay as made.
create function private.guard_partner_invitation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.email := nullif(lower(btrim(new.email)), '');
    if new.kind = 'team' and new.email is null then
      raise exception 'team_needs_email' using errcode = '22023';
    end if;
    return new;
  end if;
  if current_user = 'authenticated' and (
    new.partner_id is distinct from old.partner_id or new.kind is distinct from old.kind
    or new.email is distinct from old.email or new.code is distinct from old.code
    or new.accepted_by is distinct from old.accepted_by or new.accepted_at is distinct from old.accepted_at
  ) then
    raise exception 'invitation_fixed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_partner_invitation before insert or update on governance.partner_invitations
  for each row execute function private.guard_partner_invitation();

-- An email invitation goes out by email.
create function private.send_partner_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    perform private.enqueue('partners.invitation', jsonb_build_object('invitation_id', new.id));
  end if;
  return new;
end;
$$;
revoke all on function private.send_partner_invitation() from public, anon, authenticated;

create trigger send_partner_invitation after insert on governance.partner_invitations
  for each row execute function private.send_partner_invitation();

create trigger log_activity after insert or update or delete on governance.partner_invitations
  for each row execute function private.log_activity();

-- What an invitation link shows before signing in: whose it is, for what,
-- and for which address. Nothing else.
create function private.partner_invitation(code text)
returns table (partner_name_en text, partner_name_ar text, kind text, email text, usable boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name_en, p.name_ar, i.kind, i.email,
    i.revoked_at is null and i.expires_at > now() and p.status = 'active'
      and (i.email is null or i.accepted_at is null)
  from governance.partner_invitations i
  join governance.partners p on p.id = i.partner_id
  where i.code = partner_invitation.code;
$$;
revoke all on function private.partner_invitation(text) from public;
grant execute on function private.partner_invitation(text) to anon, authenticated;

create function governance.partner_invitation(code text)
returns table (partner_name_en text, partner_name_ar text, kind text, email text, usable boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_invitation($1) $$;
revoke all on function governance.partner_invitation(text) from public;
grant execute on function governance.partner_invitation(text) to anon, authenticated;

-- Accept: a team invitation makes the person Team; a guest invitation
-- makes them the partner's guest, verified at once when it named their
-- address, waiting for the partner when it was a shareable link.
create function private.accept_partner_invitation(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  inv governance.partner_invitations;
  mine text;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into inv from governance.partner_invitations i
  where i.code = accept_partner_invitation.code for update;
  if not found or inv.revoked_at is not null or inv.expires_at <= now()
    or not exists (select 1 from governance.partners p where p.id = inv.partner_id and p.status = 'active') then
    raise exception 'invitation_unusable' using errcode = 'P0002';
  end if;
  select lower(u.email) into mine from auth.users u where u.id = uid;
  if inv.email is not null then
    if inv.accepted_at is not null then
      if inv.accepted_by = uid then
        return inv.kind;
      end if;
      raise exception 'invitation_unusable' using errcode = 'P0002';
    end if;
    if inv.email <> mine then
      raise exception 'invitation_for_another_address' using errcode = '42501';
    end if;
  end if;

  if inv.kind = 'team' then
    if not exists (
      select 1 from access.role_assignments r
      where r.user_id = uid and r.role in ('partner_rep', 'partner_lead')
        and r.scope_type = 'partner' and r.scope_id = inv.partner_id
        and (r.ends_at is null or r.ends_at > now())
    ) then
      if (select count(distinct r.user_id) from access.role_assignments r
          where r.role in ('partner_rep', 'partner_lead') and r.scope_type = 'partner'
            and r.scope_id = inv.partner_id and (r.ends_at is null or r.ends_at > now())) >= 6 then
        raise exception 'team_full' using errcode = '22023';
      end if;
      insert into access.role_assignments (user_id, role, scope_type, scope_id, assigned_by)
      values (uid, 'partner_rep', 'partner', inv.partner_id, inv.created_by);
    end if;
  else
    insert into governance.partner_affiliations (partner_id, user_id, status, note)
    values (inv.partner_id, uid, case when inv.email is null then 'pending' else 'verified' end, null)
    on conflict (partner_id, user_id) do update
      set status = case
        when governance.partner_affiliations.status = 'verified' then 'verified'
        when excluded.status = 'verified' then 'verified'
        else 'pending' end;
  end if;

  if inv.email is not null then
    update governance.partner_invitations set accepted_by = uid, accepted_at = now()
    where id = inv.id;
  end if;
  return inv.kind;
end;
$$;
revoke all on function private.accept_partner_invitation(text) from public, anon;
grant execute on function private.accept_partner_invitation(text) to authenticated;

create function governance.accept_partner_invitation(code text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.accept_partner_invitation($1) $$;
revoke all on function governance.accept_partner_invitation(text) from public, anon;
grant execute on function governance.accept_partner_invitation(text) to authenticated;

-- An invited guest is verified by the invitation itself (the partner made
-- it); the stamp records the partner's inviter as the one who decided.
create or replace function private.stamp_affiliation_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' and current_user = 'authenticated'
      and not (select access.has_permission('partners.manage')) then
      raise exception 'affiliation_starts_pending' using errcode = '42501';
    end if;
  elsif current_user = 'authenticated' and (
    new.user_id is distinct from old.user_id
    or new.partner_id is distinct from old.partner_id
    or new.note is distinct from old.note) then
    raise exception 'affiliation_fixed' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status in ('verified', 'declined') then
      new.decided_by := coalesce(auth.uid(), new.decided_by);
      new.decided_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- People ask a partner only through its invitations now.
drop policy "Members ask to be affiliated" on governance.partner_affiliations;
create policy "Partnership managers record affiliations" on governance.partner_affiliations
  for insert to authenticated
  with check ((select private.has_permission('partners.manage')));

-- ── Guests ──────────────────────────────────────────────────────────────────
create function private.is_partner_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from governance.partner_affiliations f
    join governance.partners p on p.id = f.partner_id
    where f.user_id = (select auth.uid()) and f.status = 'verified' and p.status = 'active'
  );
$$;
revoke all on function private.is_partner_guest() from public, anon;
grant execute on function private.is_partner_guest() to authenticated;

create function core.is_partner_guest()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_partner_guest() $$;
revoke all on function core.is_partner_guest() from public, anon;
grant execute on function core.is_partner_guest() to authenticated;

-- Guests book places at events, like members.
create or replace function private.rsvp(event_id uuid, answers jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
begin
  if not (membership.is_member() or private.is_partner_guest()) then
    raise exception 'Only members and partners'' guests can book' using errcode = '42501';
  end if;

  -- Lock the event so concurrent RSVPs can't overfill it.
  select * into e from events.events where id = rsvp.event_id for update;

  if not found or e.status <> 'published' or not private.can_see_event_id(e.id) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if e.entry = 'open' then
    raise exception 'This event does not take RSVPs' using errcode = '22023';
  end if;
  if coalesce(e.ends_at, e.starts_at) < now() then
    raise exception 'This event has ended' using errcode = '22023';
  end if;

  if exists (
    select 1 from events.rsvps r
    where r.event_id = e.id and r.user_id = auth.uid() and r.status = 'confirmed'
  ) or exists (
    select 1 from events.waitlist w
    where w.event_id = e.id and w.user_id = auth.uid() and w.status = 'waiting'
  ) then
    return 'already';
  end if;

  if e.capacity is null or events.confirmed_count(e.id) < e.capacity then
    insert into events.rsvps (event_id, user_id, answers)
    values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
    perform private.enqueue('events.rsvp_confirmed',
      jsonb_build_object('event_id', e.id, 'user_id', auth.uid()));
    return 'confirmed';
  end if;

  insert into events.waitlist (event_id, user_id, answers)
  values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
  return 'waitlisted';
end;
$$;

-- Perks are for members (alumni among them) and partners' guests.
drop policy "Select by authenticated" on governance.member_offers;
create policy "Select by authenticated" on governance.member_offers
  for select to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
    or (
      is_published
      and starts_on <= current_date
      and (ends_on is null or ends_on >= current_date)
      and ((select private.membership_is_member()) or (select private.is_partner_guest()))
      and 'member_offer' = any (private.partner_grants(partner_id))
    )
  );

-- ── Membership is for AUIB addresses ────────────────────────────────────────
-- A new account on an outside address is refused unless it brings a
-- partner invitation for that address (or a shareable one) or applies to
-- partner.
create function private.sign_up_allowed(email text, meta jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select email is null
    or private.is_auib_email(email)
    or coalesce(meta ->> 'partner_applicant', '') = 'true'
    or exists (
      select 1 from governance.partner_invitations i
      join governance.partners p on p.id = i.partner_id
      where i.code = nullif(meta ->> 'invitation', '') and i.revoked_at is null
        and i.expires_at > now() and p.status = 'active'
        and (i.email is null or (i.email = lower(sign_up_allowed.email) and i.accepted_at is null))
    );
$$;
revoke all on function private.sign_up_allowed(text, jsonb) from public, anon, authenticated;

-- Sign-ups come through the auth service; accounts the database makes
-- itself (tests, the founder) are not sign-ups.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if current_user = 'supabase_auth_admin' and not private.sign_up_allowed(new.email, meta) then
    raise exception 'auib_address_required' using errcode = '42501';
  end if;

  insert into core.profiles (
    id, full_name_en, full_name_ar, locale,
    first_name_en, father_name_en, grandfather_name_en, last_name_en,
    first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar
  )
  values (
    new.id,
    left(btrim(coalesce(nullif(meta ->> 'full_name_en', ''),
      concat_ws(' ', meta ->> 'first_name_en', meta ->> 'last_name_en'))), 120),
    nullif(left(btrim(coalesce(nullif(meta ->> 'full_name_ar', ''),
      concat_ws(' ', meta ->> 'first_name_ar', meta ->> 'last_name_ar'))), 120), ''),
    case when meta ->> 'locale' = 'ar' then 'ar' else 'en' end,
    meta ->> 'first_name_en', meta ->> 'father_name_en',
    meta ->> 'grandfather_name_en', meta ->> 'last_name_en',
    meta ->> 'first_name_ar', meta ->> 'father_name_ar',
    meta ->> 'grandfather_name_ar', meta ->> 'last_name_ar'
  )
  on conflict (id) do nothing;

  if private.is_auib_email(new.email) and new.email_confirmed_at is not null then
    perform private.verify_user(new.id);
  end if;

  return new;
end;
$$;
