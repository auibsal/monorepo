-- Partners (decisions §2, §10; the Partnerships Manual): an organization
-- becomes a partner only by applying, and only once the Council has voted.
-- The Council's adopted resolution is recorded on the memorandum; the
-- President no longer signs for the Society on their own. Nobody adds a
-- partner or drafts a memorandum in the Diwan. A partner's team is its Lead
-- and up to two more, and its guests are invited by named email only.

-- ── The Council's vote ───────────────────────────────────────────────────────

alter table governance.partner_agreements
  add column resolution_id uuid references governance.resolutions (id) on delete restrict;
create index partner_agreements_resolution_idx on governance.partner_agreements (resolution_id);
comment on column governance.partner_agreements.resolution_id is
  'The Council''s adopted resolution approving the partnership (decisions §10).';

drop function governance.sign_partner_agreement(uuid, text, text);
drop function private.sign_partner_agreement(uuid, text, text);

create function private.record_partner_vote(agreement_id uuid, resolution uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a governance.partner_agreements;
  r governance.resolutions;
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
  if coalesce(btrim(a.partner_signatory), '') = '' then
    raise exception 'missing_signature' using errcode = '22023';
  end if;
  select * into r from governance.resolutions where id = record_partner_vote.resolution;
  if not found or r.status <> 'adopted' or r.body <> 'council' then
    raise exception 'needs_council_resolution' using errcode = '22023';
  end if;
  if private.has_partner_conflict(auth.uid(), a.partner_id) then
    raise exception 'conflict_declared' using errcode = '42501';
  end if;

  update governance.partner_agreements set
    status = 'signed',
    resolution_id = record_partner_vote.resolution,
    partner_signed_at = coalesce(a.partner_signed_at, now()),
    signed_by = auth.uid(),
    signed_at = now()
  where id = agreement_id;

  update governance.partners set status = 'active'
  where id = a.partner_id and status = 'prospect';

  if a.applied_by is not null and not exists (
    select 1 from access.role_assignments ra
    where ra.user_id = a.applied_by and ra.role in ('partner_rep', 'partner_lead')
      and ra.scope_type = 'partner' and ra.scope_id = a.partner_id
      and (ra.ends_at is null or ra.ends_at > now())
  ) then
    insert into access.role_assignments (user_id, role, scope_type, scope_id, assigned_by)
    values (a.applied_by, 'partner_lead', 'partner', a.partner_id, auth.uid());
  end if;
end;
$$;
revoke all on function private.record_partner_vote(uuid, uuid) from public, anon;

create function governance.record_partner_vote(agreement_id uuid, resolution uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_partner_vote($1, $2) $$;
revoke all on function governance.record_partner_vote(uuid, uuid) from public, anon;
grant execute on function governance.record_partner_vote(uuid, uuid) to authenticated;
grant execute on function private.record_partner_vote(uuid, uuid) to authenticated;

-- ── Partners and memoranda come only from applications ───────────────────────

drop policy "Partnership managers keep the register (insert)" on governance.partners;
drop policy "Partnership managers draft memoranda" on governance.partner_agreements;

-- ── The Lead and up to two more; guests by named email ───────────────────────

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
            and r.scope_id = inv.partner_id and (r.ends_at is null or r.ends_at > now())) >= 3 then
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
$function$

;

alter table governance.partner_invitations
  add constraint partner_invitations_named check (partner_id is null or email is not null);
comment on constraint partner_invitations_named on governance.partner_invitations is
  'A partner invites its team and its guests by named email only: no shareable links (decisions §2).';
