-- Partners on the platform (owner, Oct 31, 2026): "partners should now be
-- able to sign up and they can add member perks and team members, and
-- guests ... They sign a memorandum when signing up. We don't upload PDFs.
-- Verification queue for us is only for partners, while partners
-- themselves verify their own members."
--
--   * An organization applies at auibsal.org/partners/join: its profile,
--     what it proposes (the memorandum's purpose and its side), and its
--     signatory signs by name. That is a prospect partner with a draft
--     memorandum the partner has signed.
--   * The Society's queue (the Diwan's People → Verification) holds these
--     applications. The President (partners.sign) countersigns in the
--     Diwan, with no uploaded copy; the partner turns active and whoever
--     applied becomes its Partner Representative.
--   * A Partner Representative holds `partners.own` scoped to the partner:
--     the partner's own page in the Diwan (profile, perks, team, guests),
--     and Row Level Security keeps them to that partner.
--   * Outside addresses no longer wait in a Society queue: they ask a
--     partner to verify them, and the partner does.
--
-- Arabic names are needs-native-review (PROGRESS.md).

-- ── A role scoped to one partner ────────────────────────────────────────────
alter table access.role_assignments drop constraint role_assignments_scope_type_check;
alter table access.role_assignments add constraint role_assignments_scope_type_check
  check (scope_type in ('global', 'programme', 'issue', 'campaign', 'production', 'partner'));

insert into access.permissions (key, description) values
  ('partners.own', 'Keep a partner''s own page: its profile, member perks, team and guests (scoped to the partner)');

insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('partner_rep', 'Partner Representative', 'ممثل الشريك', false, 400);

insert into access.role_permissions (role, permission) values
  ('partner_rep', 'partners.own');

comment on column access.role_assignments.scope_type is
  'global, or one programme, issue, campaign, production or partner (partner_rep).';

-- A partner's representatives serve while the partnership lasts, not for
-- the Society's year.
create or replace function private.role_runs_for_the_year()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ends_at is null and new.role not in ('faculty_advisor', 'partner_rep') then
    new.ends_at := private.year_end();
  end if;
  return new;
end;
$$;

-- Partner representatives are not officers: the Notion directory leaves
-- them out.
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
    and a.role <> 'partner_rep'
  group by a.user_id, u.email, p.full_name_en, p.full_name_ar;
$$;

-- ── Applications ────────────────────────────────────────────────────────────
alter table governance.partner_agreements
  add column applied_by uuid references auth.users (id) on delete set null,
  add column partner_signed_at timestamptz;
create index partner_agreements_applied_by_idx on governance.partner_agreements (applied_by);

comment on column governance.partner_agreements.applied_by is
  'Who applied for the partnership at /partners/join; becomes the Partner Representative when the Society signs.';
comment on column governance.partner_agreements.partner_signed_at is
  'When the partner''s signatory signed by name (no uploaded copy, owner, Oct 31, 2026).';
comment on column governance.partner_agreements.signed_document_path is
  'Earlier memoranda only: signed copies are no longer uploaded (owner, Oct 31, 2026).';

-- What waits for the Society: prospects whose memorandum the partner has
-- signed and the Society has not.
create function private.partner_applications()
returns table (
  partner_id uuid, slug text, name_en text, name_ar text, kind text, reach text,
  agreement_id uuid, partner_signatory text, applied_at timestamptz, applied_by uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.name_en, p.name_ar, p.kind, p.reach,
    a.id, a.partner_signatory, a.partner_signed_at, a.applied_by
  from governance.partners p
  join governance.partner_agreements a on a.partner_id = p.id
  where p.status = 'prospect'
    and a.status = 'draft'
    and a.partner_signed_at is not null
    and (access.has_permission('partners.manage') or access.has_permission('partners.sign'))
  order by a.partner_signed_at;
$$;
revoke all on function private.partner_applications() from public, anon;
grant execute on function private.partner_applications() to authenticated;

create function governance.partner_applications()
returns table (
  partner_id uuid, slug text, name_en text, name_ar text, kind text, reach text,
  agreement_id uuid, partner_signatory text, applied_at timestamptz, applied_by uuid
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_applications() $$;
revoke all on function governance.partner_applications() from public, anon;
grant execute on function governance.partner_applications() to authenticated;

-- Apply: the organization, the memorandum's purpose and its side, the
-- benefits it asks for, and its signatory's name with the box ticked.
create function private.apply_as_partner(
  name_en text,
  name_ar text,
  kind text,
  reach text,
  url text,
  description_en text,
  description_ar text,
  purpose_en text,
  partner_will text,
  grants text[],
  signatory text,
  contact_role text,
  accepted boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  base text;
  candidate text;
  n integer := 1;
  partner uuid;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not coalesce(accepted, false) then
    raise exception 'memorandum_not_accepted' using errcode = '22023';
  end if;
  if coalesce(btrim(signatory), '') = '' then
    raise exception 'missing_signature' using errcode = '22023';
  end if;
  if exists (
    select 1 from governance.partner_agreements a
    join governance.partners p on p.id = a.partner_id
    where a.applied_by = uid and a.status = 'draft' and p.status = 'prospect'
  ) then
    raise exception 'already_applied' using errcode = '23505';
  end if;
  -- Guest editing is offered by the Society, never asked for.
  if not (coalesce(grants, '{}') <@ array['journal_submissions', 'event_cohosting',
    'member_offer', 'shared_branding', 'productions', 'volunteering', 'advertising']) then
    raise exception 'invalid_grants' using errcode = '22023';
  end if;

  base := btrim(regexp_replace(lower(btrim(name_en)), '[^a-z0-9]+', '-', 'g'), '-');
  if base = '' then
    base := 'partner';
  end if;
  base := left(base, 60);
  candidate := base;
  while exists (select 1 from governance.partners p where p.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  insert into governance.partners (
    slug, name_en, name_ar, kind, reach, url, description_en, description_ar,
    status, contact_name, contact_role, contact_email
  )
  values (
    candidate, btrim(name_en), nullif(btrim(name_ar), ''), kind, reach,
    nullif(btrim(url), ''), nullif(btrim(description_en), ''), nullif(btrim(description_ar), ''),
    'prospect', left(btrim(signatory), 200), nullif(left(btrim(contact_role), 200), ''),
    (select u.email from auth.users u where u.id = uid)
  )
  returning id into partner;

  insert into governance.partner_agreements (
    partner_id, purpose_en, partner_will, grants, starts_on, partner_signatory,
    partner_signed_at, applied_by, created_by
  )
  values (
    partner, btrim(purpose_en), nullif(btrim(partner_will), ''), coalesce(grants, '{}'),
    current_date, left(btrim(signatory), 200), now(), uid, uid
  );

  return partner;
end;
$$;
revoke all on function private.apply_as_partner(text, text, text, text, text, text, text, text, text, text[], text, text, boolean) from public, anon;
grant execute on function private.apply_as_partner(text, text, text, text, text, text, text, text, text, text[], text, text, boolean) to authenticated;

create function governance.apply_as_partner(
  name_en text,
  name_ar text,
  kind text,
  reach text,
  url text,
  description_en text,
  description_ar text,
  purpose_en text,
  partner_will text,
  grants text[],
  signatory text,
  contact_role text,
  accepted boolean
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.apply_as_partner($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) $$;
revoke all on function governance.apply_as_partner(text, text, text, text, text, text, text, text, text, text[], text, text, boolean) from public, anon;
grant execute on function governance.apply_as_partner(text, text, text, text, text, text, text, text, text, text[], text, text, boolean) to authenticated;

-- My application, for the join page: its partner, and whether it waits,
-- was signed or was declined.
create function private.my_partner_application()
returns table (partner_id uuid, slug text, name_en text, name_ar text, partner_status text, agreement_status text, applied_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.name_en, p.name_ar, p.status, a.status, a.partner_signed_at
  from governance.partner_agreements a
  join governance.partners p on p.id = a.partner_id
  where a.applied_by = (select auth.uid())
  order by a.created_at desc
  limit 1;
$$;
revoke all on function private.my_partner_application() from public, anon;
grant execute on function private.my_partner_application() to authenticated;

create function governance.my_partner_application()
returns table (partner_id uuid, slug text, name_en text, name_ar text, partner_status text, agreement_status text, applied_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_partner_application() $$;
revoke all on function governance.my_partner_application() from public, anon;
grant execute on function governance.my_partner_application() to authenticated;

-- Decline an application: the prospect ends; its draft stays on record.
create function private.decline_partner_application(partner uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('partners.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update governance.partners set status = 'ended',
    notes = nullif(concat_ws(E'\n', notes, nullif(btrim(reason), '')), '')
  where id = partner and status = 'prospect';
  if not found then
    raise exception 'not_an_application' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function private.decline_partner_application(uuid, text) from public, anon;
grant execute on function private.decline_partner_application(uuid, text) to authenticated;

create function governance.decline_partner_application(partner uuid, reason text default null)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.decline_partner_application($1, $2) $$;
revoke all on function governance.decline_partner_application(uuid, text) from public, anon;
grant execute on function governance.decline_partner_application(uuid, text) to authenticated;

-- ── The Society signs, with no uploaded copy ────────────────────────────────
-- The President's signature is the record (P11.2); the partner's signatory
-- is the name signed at application, or the one typed now for a memorandum
-- the Society drafted. Whoever applied becomes the Partner Representative.
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
    where r.user_id = a.applied_by and r.role = 'partner_rep'
      and r.scope_type = 'partner' and r.scope_id = a.partner_id
      and (r.ends_at is null or r.ends_at > now())
  ) then
    insert into access.role_assignments (user_id, role, scope_type, scope_id, assigned_by)
    values (a.applied_by, 'partner_rep', 'partner', a.partner_id, auth.uid());
  end if;
end;
$$;

-- ── The partner's team ──────────────────────────────────────────────────────
-- Up to six representatives, each with an account; any of them (or the
-- Society's partnership managers) adds or removes the others.
create function private.can_keep_partner(partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select access.has_permission('partners.manage')
    or access.has_permission('partners.own', 'partner', partner);
$$;
revoke all on function private.can_keep_partner(uuid) from public, anon;
grant execute on function private.can_keep_partner(uuid) to authenticated;

create function private.partner_team(partner uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, email text, since timestamptz)
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
  select r.user_id, p.full_name_en, p.full_name_ar, u.email::text, min(r.starts_at)
  from access.role_assignments r
  join auth.users u on u.id = r.user_id
  left join core.profiles p on p.id = r.user_id
  where r.role = 'partner_rep' and r.scope_type = 'partner' and r.scope_id = partner
    and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  group by r.user_id, p.full_name_en, p.full_name_ar, u.email
  order by min(r.starts_at);
end;
$$;
revoke all on function private.partner_team(uuid) from public, anon;
grant execute on function private.partner_team(uuid) to authenticated;

create function governance.partner_team(partner uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, email text, since timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_team($1) $$;
revoke all on function governance.partner_team(uuid) from public, anon;
grant execute on function governance.partner_team(uuid) to authenticated;

create function private.add_partner_teammate(partner uuid, email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
begin
  if not private.can_keep_partner(partner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from governance.partners p where p.id = partner and p.status = 'active') then
    raise exception 'partner_not_active' using errcode = '22023';
  end if;
  select u.id into member from auth.users u where lower(u.email) = lower(btrim(add_partner_teammate.email));
  if member is null then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from access.role_assignments r
    where r.user_id = member and r.role = 'partner_rep' and r.scope_type = 'partner'
      and r.scope_id = partner and (r.ends_at is null or r.ends_at > now())
  ) then
    return member;
  end if;
  if (select count(*) from private.partner_team(partner)) >= 6 then
    raise exception 'team_full' using errcode = '22023';
  end if;
  insert into access.role_assignments (user_id, role, scope_type, scope_id, assigned_by)
  values (member, 'partner_rep', 'partner', partner, auth.uid());
  return member;
end;
$$;
revoke all on function private.add_partner_teammate(uuid, text) from public, anon;
grant execute on function private.add_partner_teammate(uuid, text) to authenticated;

create function governance.add_partner_teammate(partner uuid, email text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.add_partner_teammate($1, $2) $$;
revoke all on function governance.add_partner_teammate(uuid, text) from public, anon;
grant execute on function governance.add_partner_teammate(uuid, text) to authenticated;

create function private.remove_partner_teammate(partner uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_keep_partner(partner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from private.partner_team(partner)) <= 1
    and not access.has_permission('partners.manage') then
    raise exception 'last_teammate' using errcode = '22023';
  end if;
  -- One added this very moment is simply withdrawn.
  delete from access.role_assignments
  where user_id = member and role = 'partner_rep' and scope_type = 'partner'
    and scope_id = partner and starts_at >= now();
  update access.role_assignments set ends_at = now()
  where user_id = member and role = 'partner_rep' and scope_type = 'partner'
    and scope_id = partner and (ends_at is null or ends_at > now());
end;
$$;
revoke all on function private.remove_partner_teammate(uuid, uuid) from public, anon;
grant execute on function private.remove_partner_teammate(uuid, uuid) to authenticated;

create function governance.remove_partner_teammate(partner uuid, member uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_partner_teammate($1, $2) $$;
revoke all on function governance.remove_partner_teammate(uuid, uuid) from public, anon;
grant execute on function governance.remove_partner_teammate(uuid, uuid) to authenticated;

-- The partners a signed-in person keeps (their Diwan page).
create function private.my_partners()
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
    where r.user_id = (select auth.uid()) and r.role = 'partner_rep'
      and r.scope_type = 'partner' and r.scope_id = p.id
      and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  )
  order by p.name_en;
$$;
revoke all on function private.my_partners() from public, anon;
grant execute on function private.my_partners() to authenticated;

create function governance.my_partners()
returns table (id uuid, slug text, name_en text, name_ar text, status text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_partners() $$;
revoke all on function governance.my_partners() from public, anon;
grant execute on function governance.my_partners() to authenticated;

-- ── Guests: the partner verifies its own people ─────────────────────────────
-- Who asked to be verified as the partner's, with their names and sign-in
-- address (the partner needs both to recognize its people).
create function private.partner_guests(partner uuid)
returns table (
  id uuid, user_id uuid, full_name_en text, full_name_ar text, email text,
  note text, status text, created_at timestamptz, decided_at timestamptz
)
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
  select f.id, f.user_id, p.full_name_en, p.full_name_ar, u.email::text,
    f.note, f.status, f.created_at, f.decided_at
  from governance.partner_affiliations f
  join auth.users u on u.id = f.user_id
  left join core.profiles p on p.id = f.user_id
  where f.partner_id = partner
  order by (f.status = 'pending') desc, f.created_at desc;
end;
$$;
revoke all on function private.partner_guests(uuid) from public, anon;
grant execute on function private.partner_guests(uuid) to authenticated;

create function governance.partner_guests(partner uuid)
returns table (
  id uuid, user_id uuid, full_name_en text, full_name_ar text, email text,
  note text, status text, created_at timestamptz, decided_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.partner_guests($1) $$;
revoke all on function governance.partner_guests(uuid) from public, anon;
grant execute on function governance.partner_guests(uuid) to authenticated;

comment on table governance.partner_affiliations is
  'People who belong to a partner organization, verified by that partner (owner, Oct 31, 2026) or the Society''s partnership managers.';

-- ── Row Level Security: each partner keeps its own ──────────────────────────
drop policy "Select by authenticated" on governance.partners;
create policy "Select by authenticated" on governance.partners
  for select to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.sign'))
    or (select private.has_permission('governance.manage'))
    or (select private.has_permission('partners.own', 'partner', id))
  );

drop policy "Partnership managers keep the register (update)" on governance.partners;
create policy "Partnership managers and the partner keep the register (update)" on governance.partners
  for update to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', id))
  )
  with check (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', id))
  );

-- A partner edits its own profile; its standing, address and listing stay
-- the Society's.
create function private.guard_partner_self_edit()
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
    or new.reach is distinct from old.reach then
    raise exception 'kept_by_the_society' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_partner_self_edit before update on governance.partners
  for each row execute function private.guard_partner_self_edit();

drop policy "Partnership managers read memoranda" on governance.partner_agreements;
create policy "Partnership managers and the partner read memoranda" on governance.partner_agreements
  for select to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.sign'))
    or (select private.has_permission('governance.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  );

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
      and (select private.membership_is_member())
      and 'member_offer' = any (private.partner_grants(partner_id))
    )
  );

drop policy "Partnership managers keep offers (insert)" on governance.member_offers;
create policy "Partnership managers and the partner keep offers (insert)" on governance.member_offers
  for insert to authenticated
  with check (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  );

drop policy "Partnership managers keep offers (update)" on governance.member_offers;
create policy "Partnership managers and the partner keep offers (update)" on governance.member_offers
  for update to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  )
  with check (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  );

drop policy "Partnership managers keep offers (delete)" on governance.member_offers;
create policy "Partnership managers and the partner keep offers (delete)" on governance.member_offers
  for delete to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  );

drop policy "Members read their own affiliations" on governance.partner_affiliations;
create policy "Members read their own affiliations" on governance.partner_affiliations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  );

drop policy "Partnership managers decide affiliations" on governance.partner_affiliations;
create policy "The partner and partnership managers decide affiliations" on governance.partner_affiliations
  for update to authenticated
  using (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  )
  with check (
    (select private.has_permission('partners.manage'))
    or (select private.has_permission('partners.own', 'partner', partner_id))
  );

-- A partner decides; it does not move someone to another partner or
-- rewrite what they said.
create or replace function private.stamp_affiliation_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' and not (select access.has_permission('partners.manage')) then
      raise exception 'affiliation_starts_pending' using errcode = '42501';
    end if;
  elsif new.user_id is distinct from old.user_id
    or new.partner_id is distinct from old.partner_id
    or new.note is distinct from old.note then
    raise exception 'affiliation_fixed' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status in ('verified', 'declined') then
      new.decided_by := auth.uid();
      new.decided_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- ── Outside addresses ask a partner, not the Society ────────────────────────
-- A new account on an outside address no longer opens a request in the
-- Society's queue: it asks one of the partners to verify it (Membership →
-- the notice it sees). Requests already waiting stay decidable.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into core.profiles (id, full_name_en, full_name_ar, locale)
  values (
    new.id,
    left(btrim(coalesce(
      nullif(meta ->> 'full_name_en', ''),
      concat_ws(' ', meta ->> 'given_name_en', meta ->> 'family_name_en')
    )), 120),
    nullif(left(btrim(coalesce(
      nullif(meta ->> 'full_name_ar', ''),
      concat_ws(' ', meta ->> 'given_name_ar', meta ->> 'family_name_ar')
    )), 120), ''),
    case when meta ->> 'locale' = 'ar' then 'ar' else 'en' end
  )
  on conflict (id) do nothing;

  if private.is_auib_email(new.email) and new.email_confirmed_at is not null then
    perform private.verify_user(new.id);
  end if;

  return new;
end;
$$;
create or replace function private.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  result jsonb := '{}'::jsonb;
begin
  if access.has_permission('members.manage') then
    result := result || jsonb_build_object(
      'members', (
        select count(*)
        from membership.memberships m
        join core.profiles p on p.id = m.user_id
        where p.verified_at is not null
      ),
      'voting_members', (
        select count(*)
        from membership.memberships m
        join core.profiles p on p.id = m.user_id
        where p.verified_at is not null and private.is_voting_member(m.user_id)
      )
    );
  end if;

  -- The Society verifies partners; partners verify their own people
  -- (owner, Oct 31, 2026). What waits is partner applications.
  if access.has_permission('partners.manage') or access.has_permission('partners.sign') then
    result := result || jsonb_build_object(
      'verification_pending', (
        select count(*) from private.partner_applications()
      ),
      'verification_oldest_at', (
        select min(applied_at) from private.partner_applications()
      )
    );
  end if;

  if access.has_permission_anywhere('events.manage') then
    result := result || jsonb_build_object(
      'upcoming_rsvps', (
        select count(*)
        from events.rsvps r
        join events.events e on e.id = r.event_id
        where r.status = 'confirmed'
          and e.starts_at > now()
          and (
            access.has_permission('events.manage')
            or access.has_permission('events.manage', 'programme', e.programme_id)
          )
      ),
      'next_event', (
        select jsonb_build_object(
          'title_en', e.title_en, 'title_ar', e.title_ar, 'starts_at', e.starts_at,
          'capacity', e.capacity, 'booked', events.confirmed_count(e.id)
        )
        from events.events e
        where e.status = 'published' and e.starts_at > now()
          and (
            access.has_permission('events.manage')
            or access.has_permission('events.manage', 'programme', e.programme_id)
          )
        order by e.starts_at
        limit 1
      )
    );
  end if;

  if access.has_permission_anywhere('journal.manage') then
    result := result || jsonb_build_object(
      'open_submissions', (
        select count(*)
        from journal.submissions s
        where s.status in ('received', 'intake_check', 'in_review', 'third_read', 'selection')
          and (
            access.has_permission('journal.manage')
            or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
          )
      ),
      'submissions_by_status', coalesce((
        select jsonb_object_agg(status, n)
        from (
          select s.status, count(*) as n, min(s.created_at) as oldest
          from journal.submissions s
          where s.status in ('received', 'intake_check', 'in_review', 'third_read', 'selection')
            and (
              access.has_permission('journal.manage')
              or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
            )
          group by s.status
        ) grouped
      ), '{}'::jsonb),
      'intake_oldest_at', (
        select min(s.created_at)
        from journal.submissions s
        where s.status in ('received', 'intake_check')
          and (
            access.has_permission('journal.manage')
            or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
          )
      )
    );
  end if;

  if access.has_permission_anywhere('charity.manage') then
    result := result || jsonb_build_object(
      'campaigns', coalesce((
        select jsonb_agg(jsonb_build_object(
          'campaign_id', c.id,
          'title_en', c.title_en,
          'title_ar', c.title_ar,
          'counted_iqd', p.counted_iqd,
          'pending_iqd', p.pending_iqd
        ) order by c.title_en)
        from charity.campaigns c
        cross join lateral charity.campaign_progress(c.id) p
        where c.status = 'active'
          and (
            access.has_permission('charity.manage')
            or access.has_permission('charity.manage', 'campaign', c.id)
          )
      ), '[]'::jsonb)
    );
  end if;

  return result;
end;
$function$;

