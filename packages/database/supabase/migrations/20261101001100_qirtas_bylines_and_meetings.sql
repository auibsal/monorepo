-- Owner, Oct 31, 2026 (after section 13):
--   1. The test piece "hey" is deleted.
--   2. The Qirtas News Desk byline is retired: every piece and credit it
--      carried is attributed to Shaheen Farjo (the President) for now, and
--      the desk's contributor row is removed.
--   3. Minutes and resolutions are one thing in the Diwan: a meeting of the
--      Council or the General Assembly (its minutes), and the resolutions it
--      adopted. A new resolution belongs to a meeting of its own body.
--   4. Partners apply without choosing grants or reach (see
--      private.apply_as_partner below).

-- ── 1. The test piece ──────────────────────────────────────────────────────
-- Its bodies, media, credits, notes and approvals go with it (cascade).
delete from journal.pieces
where lower(btrim(title_en)) in ('hey', 'test hey', 'hey test')
  and published_at is null;

-- ── 2. The News Desk's pieces to Shaheen Farjo ─────────────────────────────
do $$
declare
  v_desk uuid;
  v_person uuid;
  v_matches integer;
  v_target uuid;
  v_base_slug text := 'shaheen-farjo';
  v_candidate text;
  n integer := 1;
begin
  select c.id into v_desk from journal.contributors c where c.slug = 'waraq-news-desk';
  if v_desk is null then
    return;
  end if;

  -- The member named Shaheen Farjo; one who holds a role first.
  select count(*) into v_matches
  from core.profiles p
  where lower(btrim(p.full_name_en)) = 'shaheen farjo';
  if v_matches = 0 then
    raise notice 'No member named Shaheen Farjo: the News Desk byline stays';
    return;
  end if;
  select p.id into v_person
  from core.profiles p
  where lower(btrim(p.full_name_en)) = 'shaheen farjo'
  order by exists (
    select 1 from access.role_assignments r
    where r.user_id = p.id and (r.ends_at is null or r.ends_at > now())
  ) desc, p.created_at
  limit 1;

  -- Their own-name byline, made as journal.byline_for makes it.
  select c.id into v_target from journal.contributors c
  where c.user_id = v_person and not c.is_pen_name
  order by c.created_at
  limit 1;
  if v_target is null then
    v_candidate := v_base_slug;
    while exists (select 1 from journal.contributors c where c.slug = v_candidate) loop
      n := n + 1;
      v_candidate := v_base_slug || '-' || n;
    end loop;
    insert into journal.contributors (slug, user_id, name_en, is_pen_name)
    values (v_candidate, v_person, '', false)
    returning id into v_target;
  end if;

  update journal.pieces set contributor_id = v_target where contributor_id = v_desk;
  insert into journal.piece_credits (piece_id, contributor_id, role)
  select pc.piece_id, v_target, pc.role
  from journal.piece_credits pc
  where pc.contributor_id = v_desk
  on conflict do nothing;
  delete from journal.piece_credits where contributor_id = v_desk;
  delete from journal.contributors where id = v_desk;
end;
$$;

-- ── 3. Resolutions belong to a meeting ──────────────────────────────────────
-- A meeting is its minutes row (the body that met and the date). Every new
-- or changed resolution names one, and takes that meeting's body; a meeting
-- with resolutions can't be deleted. Older resolutions without a meeting
-- stay as they are (the check is not validated against them).
alter table governance.resolutions
  drop constraint resolutions_minutes_id_fkey,
  add constraint resolutions_minutes_id_fkey
    foreign key (minutes_id) references governance.minutes (id) on delete restrict,
  add constraint resolutions_need_a_meeting check (minutes_id is not null) not valid;

create function private.resolution_body_from_meeting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.minutes_id is not null then
    select m.body into new.body from governance.minutes m where m.id = new.minutes_id;
  end if;
  return new;
end;
$$;
revoke all on function private.resolution_body_from_meeting() from public, anon, authenticated;

create trigger body_from_meeting before insert or update of minutes_id, body
  on governance.resolutions
  for each row execute function private.resolution_body_from_meeting();

-- ── 4. Applying to partner, simpler ─────────────────────────────────────────
-- An application asks for no grants (what a partner turns on for itself and
-- its guests is approved by the Society as it comes), carries one statement
-- of the partnership (its purpose and the partner's side together), names
-- its kind in words when it is "other", and needs no reach for an AUIB club
-- or department, which is at AUIB.
alter table governance.partners
  add column kind_other text check (char_length(kind_other) between 1 and 120);

drop function governance.apply_as_partner(text, text, text, text, text, text, text, text, text, text[], text, text, boolean);
drop function private.apply_as_partner(text, text, text, text, text, text, text, text, text, text[], text, text, boolean);

create function private.apply_as_partner(
  name_en text,
  name_ar text,
  kind text,
  kind_other text,
  reach text,
  url text,
  description_en text,
  description_ar text,
  purpose_en text,
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
  written text := nullif(left(btrim(kind_other), 120), '');
  at_auib boolean := kind in ('club', 'department');
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
  if kind = 'other' and written is null then
    raise exception 'kind_other_required' using errcode = '22023';
  end if;
  if not at_auib and coalesce(reach, '') not in ('iraq', 'international') then
    raise exception 'invalid_reach' using errcode = '22023';
  end if;
  if exists (
    select 1 from governance.partner_agreements a
    join governance.partners p on p.id = a.partner_id
    where a.applied_by = uid and a.status = 'draft' and p.status = 'prospect'
  ) then
    raise exception 'already_applied' using errcode = '23505';
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
    slug, name_en, name_ar, kind, kind_other, reach, url, description_en,
    description_ar, status, contact_name, contact_role, contact_email
  )
  values (
    candidate, btrim(name_en), nullif(btrim(name_ar), ''), kind,
    case when kind = 'other' then written end,
    case when at_auib then 'auib' else reach end,
    nullif(btrim(url), ''), nullif(btrim(description_en), ''), nullif(btrim(description_ar), ''),
    'prospect', left(btrim(signatory), 200), nullif(left(btrim(contact_role), 200), ''),
    (select u.email from auth.users u where u.id = uid)
  )
  returning id into partner;

  insert into governance.partner_agreements (
    partner_id, purpose_en, grants, starts_on, partner_signatory,
    partner_signed_at, applied_by, created_by
  )
  values (
    partner, btrim(purpose_en), '{}', current_date, left(btrim(signatory), 200),
    now(), uid, uid
  );

  return partner;
end;
$$;
revoke all on function private.apply_as_partner(text, text, text, text, text, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function private.apply_as_partner(text, text, text, text, text, text, text, text, text, text, text, boolean) to authenticated;

create function governance.apply_as_partner(
  name_en text,
  name_ar text,
  kind text,
  kind_other text,
  reach text,
  url text,
  description_en text,
  description_ar text,
  purpose_en text,
  signatory text,
  contact_role text,
  accepted boolean
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.apply_as_partner($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) $$;
revoke all on function governance.apply_as_partner(text, text, text, text, text, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function governance.apply_as_partner(text, text, text, text, text, text, text, text, text, text, text, boolean) to authenticated;

-- ── 5. What a partner publishes waits for the Society ───────────────────────
-- A partner keeps its perks, but members and guests see one only once
-- Partnerships (partners.manage) publishes it. A partner's "publish" asks
-- (submitted_at); changing a published perk takes it down until it is
-- published again. Taking one down needs no one.
alter table governance.member_offers add column submitted_at timestamptz;

create function private.perks_wait_for_the_society()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Partnerships, and trusted server code (no signed-in user), publish.
  if coalesce((select auth.role()), 'service_role') = 'service_role'
    or (select private.has_permission('partners.manage')) then
    if new.is_published then
      new.submitted_at := null;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.is_published then
      new.is_published := false;
      new.submitted_at := now();
    else
      new.submitted_at := null;
    end if;
  elsif new.is_published and (
    not old.is_published
    or (new.title_en, new.title_ar, new.details_en, new.details_ar, new.code,
        new.starts_on, new.ends_on)
       is distinct from
       (old.title_en, old.title_ar, old.details_en, old.details_ar, old.code,
        old.starts_on, old.ends_on)
  ) then
    new.is_published := false;
    new.submitted_at := now();
  elsif not new.is_published and old.is_published then
    new.submitted_at := null;
  else
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end;
$$;
revoke all on function private.perks_wait_for_the_society() from public, anon, authenticated;

create trigger wait_for_the_society before insert or update
  on governance.member_offers
  for each row execute function private.perks_wait_for_the_society();

-- ── 6. A partner asks for what it turns on; the Society approves ────────────
-- A partner's grants (perks for members and guests, Qirtas submissions,
-- co-hosting, volunteering …) are asked for from its dashboard
-- (asked_grants) and given by Partnerships (partners.manage), on the
-- signed memorandum. Guest editing stays the Society's to offer. The rest
-- of a signed memorandum stays fixed.
alter table governance.partner_agreements
  add column asked_grants text[]
    check (asked_grants <@ array['journal_submissions', 'event_cohosting', 'member_offer',
      'shared_branding', 'productions', 'volunteering', 'advertising']);

create or replace function private.guard_signed_agreement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('signed', 'ended') and (
    new.partner_id is distinct from old.partner_id
    or new.purpose_en is distinct from old.purpose_en
    or new.purpose_ar is distinct from old.purpose_ar
    or new.starts_on is distinct from old.starts_on
    or new.sal_will is distinct from old.sal_will
    or new.partner_will is distinct from old.partner_will
    or new.money is distinct from old.money
    or new.branding is distinct from old.branding
    or new.people_safety is distinct from old.people_safety
    or new.partner_signatory is distinct from old.partner_signatory
    or new.signed_by is distinct from old.signed_by
    or new.signed_at is distinct from old.signed_at
    or new.signed_document_path is distinct from old.signed_document_path
  ) then
    raise exception 'agreement_signed' using errcode = '22023';
  end if;
  -- Grants and requests for them change only through ask_for_grants and
  -- give_grants (or trusted server code), never by a direct update.
  if current_user = 'authenticated' and (
    new.grants is distinct from old.grants and old.status <> 'draft'
    or new.asked_grants is distinct from old.asked_grants
  ) then
    raise exception 'grants_through_rpc' using errcode = '42501';
  end if;
  if old.status = 'ended' and new.status <> 'ended' then
    raise exception 'agreement_ended' using errcode = '22023';
  end if;
  if old.status = 'draft' and new.status = 'signed' and current_user = 'authenticated' then
    raise exception 'sign_through_rpc' using errcode = '42501';
  end if;
  if old.status = 'draft' and new.status = 'ended' then
    raise exception 'draft_cannot_end' using errcode = '22023';
  end if;
  return new;
end;
$$;

create function private.ask_for_grants(agreement_id uuid, grants text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a governance.partner_agreements;
begin
  select * into a from governance.partner_agreements g where g.id = ask_for_grants.agreement_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not (select private.has_permission('partners.lead', 'partner', a.partner_id)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.status <> 'signed' then
    raise exception 'not_signed' using errcode = '22023';
  end if;
  update governance.partner_agreements g
  set asked_grants = case
    when coalesce(cardinality(ask_for_grants.grants), 0) = 0 then null
    else (select array_agg(distinct x order by x) from unnest(ask_for_grants.grants) x)
  end
  where g.id = a.id;
end;
$$;
revoke all on function private.ask_for_grants(uuid, text[]) from public, anon;
grant execute on function private.ask_for_grants(uuid, text[]) to authenticated;

create function governance.ask_for_grants(agreement_id uuid, grants text[])
returns void
language sql
security invoker
set search_path = ''
as $$ select private.ask_for_grants($1, $2) $$;
revoke all on function governance.ask_for_grants(uuid, text[]) from public, anon;
grant execute on function governance.ask_for_grants(uuid, text[]) to authenticated;

create function private.give_grants(agreement_id uuid, grants text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a governance.partner_agreements;
begin
  if not (select private.has_permission('partners.manage')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into a from governance.partner_agreements g where g.id = give_grants.agreement_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if a.status <> 'signed' then
    raise exception 'not_signed' using errcode = '22023';
  end if;
  update governance.partner_agreements g
  set grants = coalesce((select array_agg(distinct x order by x) from unnest(give_grants.grants) x), '{}'),
      asked_grants = null
  where g.id = a.id;
end;
$$;
revoke all on function private.give_grants(uuid, text[]) from public, anon;
grant execute on function private.give_grants(uuid, text[]) to authenticated;

create function governance.give_grants(agreement_id uuid, grants text[])
returns void
language sql
security invoker
set search_path = ''
as $$ select private.give_grants($1, $2) $$;
revoke all on function governance.give_grants(uuid, text[]) from public, anon;
grant execute on function governance.give_grants(uuid, text[]) to authenticated;
