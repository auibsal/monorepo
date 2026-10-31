-- One membership, of one kind (owner, Oct 31, 2026, the third decision that
-- day):
--   member   an AUIB address (tiers: Member, Fellow, Honorary Fellow, Life
--            Member; Voting Member is earned by activity);
--   guest    someone from outside AUIB, invited by the Society or by one of
--            its partners;
--   partner  a partner's Lead or Team.
-- An account is exactly one of these. Staff is a member who holds a Society
-- role: a tag on the card, and the Diwan. Every kind carries the live card.
-- Also: guests the Society invites itself, and the Callboard read by anyone.

-- ── Who is what ─────────────────────────────────────────────────────────────

-- On a partner's team now.
create function private.is_partner_team(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from access.role_assignments r
    where r.user_id = uid and r.role in ('partner_rep', 'partner_lead')
      and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  );
$$;
revoke all on function private.is_partner_team(uuid) from public, anon, authenticated;

-- Guests the Society invites itself (Membership), with no partner.
create table membership.guests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

comment on table membership.guests is
  'The Society''s own guests (owner, Oct 31, 2026): people outside AUIB invited by Membership, with no partner. A partner''s guests are its verified affiliations.';

create index guests_invited_by_idx on membership.guests (invited_by);

alter table membership.guests enable row level security;

revoke all on membership.guests from anon, authenticated;
grant select on membership.guests to authenticated;
grant update (ended_at) on membership.guests to authenticated;
grant all on membership.guests to service_role;

create policy "No third-party apps" on membership.guests
  as restrictive for all to authenticated
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

create policy "Guests and Membership read the Society's guests" on membership.guests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('members.manage')));

create policy "Membership ends a guest's welcome" on membership.guests
  for update to authenticated
  using ((select private.has_permission('members.manage')))
  with check ((select private.has_permission('members.manage')));

create trigger log_activity after insert or update or delete on membership.guests
  for each row execute function private.log_activity();

-- A guest now: the Society's, or verified by an active partner.
create function private.is_guest(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from membership.guests g
    where g.user_id = uid and (g.ended_at is null or g.ended_at > now())
  ) or exists (
    select 1 from governance.partner_affiliations f
    join governance.partners p on p.id = f.partner_id
    where f.user_id = uid and f.status = 'verified' and p.status = 'active'
  );
$$;
revoke all on function private.is_guest(uuid) from public, anon, authenticated;

-- What the policies already ask (booking, perks): now any guest.
create or replace function private.is_partner_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_guest((select auth.uid())) $$;

-- Holds a Society role (anything but a partner's): staff.
create function private.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from access.role_assignments r
    where r.user_id = uid and r.role not in ('partner_rep', 'partner_lead')
      and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  );
$$;
revoke all on function private.is_staff(uuid) from public, anon, authenticated;

-- The one kind an account holds, or null (signed up, nothing yet).
create function private.membership_kind(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_member(uid) then 'member'
    when private.is_partner_team(uid) then 'partner'
    when private.is_guest(uid) then 'guest'
  end;
$$;
revoke all on function private.membership_kind(uuid) from public, anon, authenticated;

create function private.my_membership()
returns table (kind text, staff boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select private.membership_kind((select auth.uid())),
    private.is_member((select auth.uid())) and private.is_staff((select auth.uid()));
$$;
revoke all on function private.my_membership() from public, anon;
grant execute on function private.my_membership() to authenticated;

create function membership.my_membership()
returns table (kind text, staff boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_membership() $$;
revoke all on function membership.my_membership() from public, anon;
grant execute on function membership.my_membership() to authenticated;

-- ── One kind per account ────────────────────────────────────────────────────

-- Whether an account may take on a kind. A member is never a guest or a
-- partner's; a partner's person is never a guest; a guest is never on a
-- partner's team. (An AUIB club's team signs in with the club's address.)
create function private.may_become(uid uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case kind
    when 'guest' then not (private.is_member(uid) or private.is_partner_team(uid))
    when 'partner' then not (private.is_member(uid) or private.is_guest(uid))
    else true
  end;
$$;
revoke all on function private.may_become(uuid, text) from public, anon, authenticated;

create function private.one_membership_affiliation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('pending', 'verified')
    and (tg_op = 'INSERT' or old.status not in ('pending', 'verified'))
    and not private.may_become(new.user_id, 'guest') then
    raise exception 'one_membership' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.one_membership_affiliation() from public, anon, authenticated;

create trigger one_membership before insert or update of status on governance.partner_affiliations
  for each row execute function private.one_membership_affiliation();

create function private.one_membership_guest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.ended_at is null or new.ended_at > now())
    and (tg_op = 'INSERT' or old.ended_at is not null)
    and not private.may_become(new.user_id, 'guest') then
    raise exception 'one_membership' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.one_membership_guest() from public, anon, authenticated;

create trigger one_membership before insert or update of ended_at on membership.guests
  for each row execute function private.one_membership_guest();

-- A partner's roles only for accounts that are neither members nor guests;
-- the Society's roles never for a guest or a partner's person, except a
-- guest editor for one Edition (a partner's poet, as its memorandum allows).
create function private.one_membership_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ends_at is not null and new.ends_at <= now() then
    return new;
  end if;
  if new.role in ('partner_rep', 'partner_lead') then
    if not private.may_become(new.user_id, 'partner') then
      raise exception 'one_membership' using errcode = '42501';
    end if;
  elsif new.role <> 'guest_editor'
    and (private.is_guest(new.user_id) or private.is_partner_team(new.user_id)) then
    raise exception 'one_membership' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.one_membership_role() from public, anon, authenticated;

create trigger one_membership before insert on access.role_assignments
  for each row execute function private.one_membership_role();

-- Applying to partner makes the applicant its Lead, so a member applies
-- with the organization's own address, never with their membership.
create function private.one_membership_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.applied_by is not null and tg_op = 'INSERT'
    and not private.may_become(new.applied_by, 'partner') then
    raise exception 'one_membership' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.one_membership_application() from public, anon, authenticated;

create trigger one_membership before insert on governance.partner_agreements
  for each row execute function private.one_membership_application();

-- What already overlaps ends now: a member keeps their membership, and a
-- partner's person keeps the partner.
update governance.partner_affiliations f set status = 'ended'
where f.status in ('pending', 'verified')
  and (private.is_member(f.user_id) or private.is_partner_team(f.user_id));

update access.role_assignments r set ends_at = now()
where r.role in ('partner_rep', 'partner_lead')
  and (r.ends_at is null or r.ends_at > now())
  and private.is_member(r.user_id);

-- ── Invitations: the Society's guests too ───────────────────────────────────
-- A guest invitation with no partner is the Society's own, made by
-- Membership (members.manage). The addresses move to /invite/<code>.

alter table governance.partner_invitations alter column partner_id drop not null;
alter table governance.partner_invitations
  add constraint partner_invitations_society_guests check (partner_id is not null or kind = 'guest');

create function private.can_invite(partner uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when partner is null then access.has_permission('members.manage')
    when kind = 'team' then private.can_lead_partner(partner)
    else private.can_keep_partner(partner)
  end;
$$;
revoke all on function private.can_invite(uuid, text) from public, anon;
grant execute on function private.can_invite(uuid, text) to authenticated;

drop policy "The partner and partnership managers read invitations" on governance.partner_invitations;
drop policy "The partner invites" on governance.partner_invitations;
drop policy "The partner withdraws an invitation" on governance.partner_invitations;

create policy "Whoever invites reads invitations" on governance.partner_invitations
  for select to authenticated
  using (case when partner_id is null then (select access.has_permission('members.manage'))
    else (select private.can_keep_partner(partner_id)) end);

create policy "The partner or Membership invites" on governance.partner_invitations
  for insert to authenticated
  with check (
    accepted_by is null and accepted_at is null and revoked_at is null
    and (select private.can_invite(partner_id, kind))
    and (partner_id is null
      or exists (select 1 from governance.partners p where p.id = partner_id and p.status = 'active'))
  );

create policy "Whoever invites withdraws" on governance.partner_invitations
  for update to authenticated
  using ((select private.can_invite(partner_id, kind)))
  with check ((select private.can_invite(partner_id, kind)));

-- An AUIB address is a member's: never invited as a guest or a partner's.
create or replace function private.guard_partner_invitation()
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
    if new.email is not null and private.is_auib_email(new.email) then
      raise exception 'auib_is_membership' using errcode = '22023';
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

-- Usable: not withdrawn or expired, its partner (if any) active, and an
-- email invitation not yet taken.
create function private.invitation_usable(inv governance.partner_invitations)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select inv.revoked_at is null and inv.expires_at > now()
    and (inv.partner_id is null
      or exists (select 1 from governance.partners p where p.id = inv.partner_id and p.status = 'active'))
    and (inv.email is null or inv.accepted_at is null);
$$;
revoke all on function private.invitation_usable(governance.partner_invitations) from public, anon, authenticated;

create or replace function private.partner_invitation(code text)
returns table (partner_name_en text, partner_name_ar text, kind text, email text, usable boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name_en, p.name_ar, i.kind, i.email, private.invitation_usable(i)
  from governance.partner_invitations i
  left join governance.partners p on p.id = i.partner_id
  where i.code = partner_invitation.code;
$$;

create or replace function private.sign_up_allowed(email text, meta jsonb)
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
      where i.code = nullif(meta ->> 'invitation', '')
        and private.invitation_usable(i)
        and (i.email is null or i.email = lower(sign_up_allowed.email))
    );
$$;

create or replace function private.accept_partner_invitation(code text)
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
  if not found then
    raise exception 'invitation_unusable' using errcode = 'P0002';
  end if;
  select lower(u.email) into mine from auth.users u where u.id = uid;
  if inv.email is not null and inv.accepted_at is not null and inv.accepted_by = uid then
    return inv.kind;
  end if;
  if not private.invitation_usable(inv) then
    raise exception 'invitation_unusable' using errcode = 'P0002';
  end if;
  if inv.email is not null and inv.email <> mine then
    raise exception 'invitation_for_another_address' using errcode = '42501';
  end if;
  -- One membership: a member stays a member, and so on.
  if not private.may_become(uid, case when inv.kind = 'team' then 'partner' else 'guest' end) then
    raise exception 'one_membership' using errcode = '42501';
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
  elsif inv.partner_id is null then
    -- The Society's own guest: welcome at once, link or email.
    insert into membership.guests (user_id, invited_by) values (uid, inv.created_by)
    on conflict (user_id) do update set ended_at = null, invited_by = excluded.invited_by;
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

-- ── Every kind carries the card ─────────────────────────────────────────────

create or replace function private.my_card()
returns table (number integer, code text, secret text, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.membership_kind((select auth.uid())) is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into membership.cards (user_id) values ((select auth.uid()))
  on conflict (user_id) do nothing;
  return query
    select c.number, c.code, encode(c.secret, 'hex'), c.issued_at
    from membership.cards c where c.user_id = (select auth.uid());
end;
$$;

create or replace function private.reissue_card()
returns table (number integer, code text, secret text, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.membership_kind((select auth.uid())) is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into membership.cards (user_id) values ((select auth.uid()))
  on conflict (user_id) do update
    set code = encode(extensions.gen_random_bytes(10), 'hex'),
        secret = extensions.gen_random_bytes(20),
        issued_at = now();
  return query
    select c.number, c.code, encode(c.secret, 'hex'), c.issued_at
    from membership.cards c where c.user_id = (select auth.uid());
end;
$$;

-- The check says which kind the card is, and Staff for a member holding a
-- Society role. `active` stays "a membership in force".
drop function membership.verify_card(text, text);
drop function private.verify_card(text, text);

create function private.verify_card(code text, digits text default null)
returns table (
  number integer, full_name_en text, full_name_ar text, tier membership.tier,
  member_since date, active boolean, voting boolean, live boolean,
  kind text, staff boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.number, p.full_name_en, p.full_name_ar, m.tier, m.member_since,
    private.membership_kind(c.user_id) is not null,
    private.is_voting_member(c.user_id),
    coalesce(private.totp_live(c.secret, verify_card.digits), false),
    private.membership_kind(c.user_id),
    private.is_member(c.user_id) and private.is_staff(c.user_id)
  from membership.cards c
  join core.profiles p on p.id = c.user_id
  left join membership.memberships m on m.user_id = c.user_id
  where c.code = lower(trim(verify_card.code));
$$;
revoke all on function private.verify_card(text, text) from public;
grant execute on function private.verify_card(text, text) to anon, authenticated;

create function membership.verify_card(code text, digits text default null)
returns table (
  number integer, full_name_en text, full_name_ar text, tier membership.tier,
  member_since date, active boolean, voting boolean, live boolean,
  kind text, staff boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.verify_card($1, $2) $$;
revoke all on function membership.verify_card(text, text) from public;
grant execute on function membership.verify_card(text, text) to anon, authenticated;

-- ── Signing in: say when there is no account ────────────────────────────────
-- Read only by the API routes (the secret key), after a sign-in fails, so
-- the page can say "no account with this address" (owner, Oct 31, 2026).
create function private.account_exists(email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where lower(u.email) = lower(btrim(account_exists.email)));
$$;
revoke all on function private.account_exists(text) from public, anon, authenticated;
grant execute on function private.account_exists(text) to service_role;

-- ── The Callboard, read by anyone ───────────────────────────────────────────
-- Get involved is the careers page (owner, Oct 31, 2026): every open place,
-- inside the Society and with its partners, for anyone to read; replying
-- still takes membership. Two more kinds: a standing volunteer place, and a
-- place with one of the Society's partners.

alter table programmes.openings drop constraint openings_kind_check;
alter table programmes.openings add constraint openings_kind_check
  check (kind in ('role', 'apprenticeship', 'first_ink', 'volunteer', 'partner'));
alter table programmes.openings add constraint openings_partner_place
  check (kind <> 'partner' or partner_id is not null);

create function private.open_places()
returns table (
  id uuid, kind text, owner text, title_en text, title_ar text,
  body_en text, body_ar text, skills text[], closes_at timestamptz,
  places integer, term_from date, term_to date, desk journal.desk,
  programme_slug text, programme_name_en text, programme_name_ar text,
  partner_name_en text, partner_name_ar text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.kind, o.owner, o.title_en, o.title_ar, o.body_en, o.body_ar,
    o.skills, o.closes_at, o.places, o.term_from, o.term_to, o.desk,
    g.slug, g.name_en, g.name_ar, p.name_en, p.name_ar, o.created_at
  from programmes.openings o
  left join core.programmes g on g.id = o.programme_id
  left join governance.partners p on p.id = o.partner_id
  where o.is_open and (o.closes_at is null or o.closes_at > now())
  order by o.created_at desc;
$$;
revoke all on function private.open_places() from public;
grant execute on function private.open_places() to anon, authenticated;

create function programmes.open_places()
returns table (
  id uuid, kind text, owner text, title_en text, title_ar text,
  body_en text, body_ar text, skills text[], closes_at timestamptz,
  places integer, term_from date, term_to date, desk journal.desk,
  programme_slug text, programme_name_en text, programme_name_ar text,
  partner_name_en text, partner_name_ar text, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.open_places() $$;
revoke all on function programmes.open_places() from public;
grant execute on function programmes.open_places() to anon, authenticated;

-- The name the API route calls (the secret key only).
create function core.account_exists(email text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.account_exists($1) $$;
revoke all on function core.account_exists(text) from public, anon, authenticated;
grant execute on function core.account_exists(text) to service_role;
