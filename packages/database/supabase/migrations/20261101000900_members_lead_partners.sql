-- Owner, Oct 31, 2026 (after one membership of one kind):
--   1. A member may also lead their club's partnership: a partner's roles
--      are open to members. They stay members (their kind is "member"),
--      with the partner's dashboard beside Membership. A guest is still
--      never on a partner's team, and a partner's person never a guest.
--   2. Every partner on record is removed, and the guest account
--      shaheen.farjo@gmail.com with it, so partnerships start afresh.
--   3. One photo setting: "Photos of me at the Society's events may be
--      shared" is the camera-shy flag, read the other way round.
--   4. A signature is the signer's name on the platform, dated when signed:
--      the applicant's memorandum is signed in their own name.

-- ── 1. Members may lead a partnership ───────────────────────────────────────

create or replace function private.may_become(uid uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case kind
    when 'guest' then not (private.is_member(uid) or private.is_partner_team(uid))
    when 'partner' then not private.is_guest(uid)
    else true
  end;
$$;

-- A member on a partner's team keeps the Society's roles too; only a guest,
-- or a partner's person who is not a member, holds none of them (save one
-- Edition's guest editor).
create or replace function private.one_membership_role()
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
    and (private.is_guest(new.user_id)
      or (private.is_partner_team(new.user_id) and not private.is_member(new.user_id))) then
    raise exception 'one_membership' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── 2. Partners start afresh ────────────────────────────────────────────────

-- Places that name a partner hold it back (on delete restrict); their
-- replies and placements go with them. Roles scoped to a partner have no
-- foreign key, so they go by hand. Everything else that names a partner
-- cascades or lets go of it (the database's own rules).
delete from programmes.openings where partner_id is not null;
delete from access.role_assignments where scope_type = 'partner';
delete from governance.partners;

-- The guest account the owner named (owner, Oct 31, 2026). Deleting the
-- sign-in account removes its profile, card and guest membership with it.
delete from auth.users where lower(email) = 'shaheen.farjo@gmail.com';

-- ── 3. One photo setting ────────────────────────────────────────────────────
-- The details form had its own "photos may be shared"; the profile's
-- camera-shy flag is the one setting now.
alter table core.member_details drop column photo_consent;

-- ── 4. Signed in one's own name ─────────────────────────────────────────────
-- An application to partner is signed by whoever applies, in the name they
-- hold on the platform (both languages where kept); the date is when it is
-- made (created_at). The name is never typed.
create function private.sign_as_applicant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signer text;
begin
  if new.applied_by is not null then
    select concat_ws(' · ', nullif(p.full_name_en, ''), nullif(p.full_name_ar, ''))
      into signer
    from core.profiles p where p.id = new.applied_by;
    if coalesce(signer, '') <> '' then
      new.partner_signatory := signer;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.sign_as_applicant() from public, anon, authenticated;

create trigger sign_as_applicant before insert on governance.partner_agreements
  for each row execute function private.sign_as_applicant();

-- An author's Qirtas agreement is signed the same way: in the author's name
-- on the platform, dated when signed (signed_at).
create function private.sign_in_own_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signer text;
begin
  select concat_ws(' · ', nullif(p.full_name_en, ''), nullif(p.full_name_ar, ''))
    into signer
  from core.profiles p where p.id = coalesce(new.signed_by, auth.uid());
  if coalesce(signer, '') <> '' then
    new.signer_name := signer;
  end if;
  return new;
end;
$$;
revoke all on function private.sign_in_own_name() from public, anon, authenticated;

create trigger sign_in_own_name before insert on journal.agreements
  for each row execute function private.sign_in_own_name();
