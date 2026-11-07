-- One invitation system (decisions §2, §10): every invitation that gives
-- access is a single-use email invitation to a named person, valid 14 days,
-- revocable, logged and accepted only with that address. The Director of
-- Membership invites Associate and Honorary Members (Honorary only after the
-- Council's adopted resolution, F-34); a Partner Lead the team and the
-- partner's guests; an event's lead guests for that event. There are no
-- shareable links and no Society-wide guest invitations. No invitation ever
-- grants a role or a seat.

-- The links made before (no named address) stop working; they stay logged.
update governance.partner_invitations set revoked_at = now()
where email is null and revoked_at is null;

alter table governance.partner_invitations
  drop constraint partner_invitations_kind_check,
  drop constraint partner_invitations_check,
  drop constraint partner_invitations_society_guests,
  drop constraint partner_invitations_named;
alter table governance.partner_invitations
  add constraint partner_invitations_kind_check
    check (kind in ('team', 'guest', 'associate', 'honorary')),
  add constraint partner_invitations_named_email check (email is not null) not valid,
  add constraint partner_invitations_whose check (
    case kind
      when 'team' then partner_id is not null
      when 'guest' then partner_id is not null or event_id is not null
      else partner_id is null and event_id is null
    end
  ) not valid,
  add column resolution_id uuid references governance.resolutions (id) on delete restrict,
  add constraint partner_invitations_honorary_vote
    check (kind <> 'honorary' or resolution_id is not null);
create index partner_invitations_resolution_idx on governance.partner_invitations (resolution_id);
grant select (resolution_id), insert (resolution_id) on governance.partner_invitations to authenticated;
comment on column governance.partner_invitations.resolution_id is
  'For an Honorary Member: the Council''s adopted resolution (F-34).';

-- Who sends which: classes are the Director of Membership's; a partner's
-- team and guests its own. Guests from an event's lead are in the policy.
create or replace function private.can_invite(partner uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when partner is null then kind in ('associate', 'honorary') and access.has_permission('members.manage')
    when kind = 'team' then private.can_lead_partner(partner)
    when kind = 'guest' then private.can_keep_partner(partner)
    else false
  end;
$$;

-- Every invitation names its person; an AUIB address joins as a student
-- itself, but faculty and staff (also AUIB addresses) may be invited to a
-- class.
create or replace function private.guard_partner_invitation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.email := nullif(lower(btrim(new.email)), '');
    if new.email is null then
      raise exception 'invitation_needs_email' using errcode = '22023';
    end if;
    if new.kind in ('team', 'guest') and private.is_auib_email(new.email) then
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

-- An Honorary Member's invitation names an adopted Council resolution.
create function private.guard_class_invitation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'honorary' and not exists (
    select 1 from governance.resolutions r
    where r.id = new.resolution_id and r.status = 'adopted' and r.body = 'council'
  ) then
    raise exception 'needs_council_resolution' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger guard_class_invitation before insert on governance.partner_invitations
  for each row execute function private.guard_class_invitation();

create or replace function private.accept_partner_invitation(code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if not private.may_become(uid, case inv.kind when 'team' then 'partner' when 'guest' then 'guest' else 'member' end) then
    raise exception 'one_membership' using errcode = '42501';
  end if;

  if inv.kind in ('associate', 'honorary') then
    -- Joining by class (decisions §2): the invitation is the Director of
    -- Membership's (and, for Honorary Members, the Council's) word for the
    -- address, so the account counts as verified. A guest becomes a member.
    update core.profiles set verified_at = coalesce(verified_at, now()) where id = uid;
    update membership.guests set ended_at = now() where user_id = uid and ended_at is null;
    insert into membership.memberships (user_id, tier)
    values (uid, inv.kind::membership.tier)
    on conflict (user_id) do update set tier = excluded.tier;
  elsif inv.kind = 'team' then
    if not exists (
      select 1 from access.role_assignments r
      where r.user_id = uid and r.role in ('partner_rep', 'partner_lead')
        and r.scope_type = 'partner' and r.scope_id = inv.partner_id
        and (r.ends_at is null or r.ends_at > now())
    ) then
      if (select count(distinct r.user_id) from access.role_assignments r
          where r.role in ('partner_rep', 'partner_lead') and r.scope_type = 'partner'
            and r.scope_id = inv.partner_id and (r.ends_at is null or r.ends_at > now())) >= 3 then
        raise exception 'team_full' using errcode = '22023';
      end if;
      insert into access.role_assignments (user_id, role, scope_type, scope_id, assigned_by)
      values (uid, 'partner_rep', 'partner', inv.partner_id, inv.created_by);
    end if;
  elsif inv.partner_id is null then
    -- A guest an event's lead invited by name: the Society's guest.
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
$function$;
