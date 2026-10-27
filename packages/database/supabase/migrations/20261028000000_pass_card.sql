-- The IDEA Pass card replaces SAL's membership card (owner, 2026-10-27),
-- along with the perks, which come with the Pass. Behind the same switch as
-- the Pass sign-in; SAL's card tables stay until a later step removes them.
--
-- At the door and on the Typewriter Tour an officer scans the member's Pass.
-- The API checks the code with The IDEA (its card check needs SAL's client
-- secret, so the browser can't) and records the scan here: whose card it
-- was, who scanned it. The officer's own session then spends the scan
-- within two minutes to check the member in or sign their Six Words, so the
-- permissions are checked here as before.

-- ── The card's picture ──────────────────────────────────────────────────────

-- The Pass card as The IDEA draws it (SVG, no QR), in both languages, read
-- at sign-in. Shown on the member's pages as an image; the live card with
-- its code is on the Pass itself.
alter table access.pass_links
  add column card_svg_en text check (char_length(card_svg_en) <= 200000),
  add column card_svg_ar text check (char_length(card_svg_ar) <= 200000),
  add column card_updated_at timestamptz;

-- ── Scans ───────────────────────────────────────────────────────────────────

create table access.pass_scans (
  id uuid primary key default gen_random_uuid(),
  holder uuid not null references auth.users (id) on delete cascade,
  scanned_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

comment on table access.pass_scans is
  'IDEA Pass cards an officer scanned, after The IDEA confirmed the code: spent once, within two minutes, by the officer who scanned it. Written by the API.';

create index pass_scans_holder_idx on access.pass_scans (holder);
create index pass_scans_scanned_by_idx on access.pass_scans (scanned_by);

alter table access.pass_scans enable row level security;

create policy "Officers read their own scans"
  on access.pass_scans as permissive for select to authenticated
  using (scanned_by = (select auth.uid()));
create policy "Third-party apps reach only their areas"
  on access.pass_scans as restrictive for all to authenticated
  using ((select private.client_allows('access')))
  with check ((select private.client_allows('access')));

revoke all on access.pass_scans from anon, authenticated;
grant select on access.pass_scans to authenticated;
grant all on access.pass_scans to service_role;

-- Records a scan The IDEA confirmed: the SAL account linked to that Pass,
-- for the officer who scanned it. Nothing when no account is linked (the
-- person has never signed in to SAL with it).
create function private.record_pass_scan(pass_sub text, scanned_by uuid)
returns table (scan uuid, user_id uuid, full_name_en text, full_name_ar text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  holder uuid;
begin
  select l.user_id into holder from access.pass_links l
  where l.pass_sub = record_pass_scan.pass_sub;
  if holder is null then
    return;
  end if;
  return query
    with made as (
      insert into access.pass_scans (holder, scanned_by)
      values (holder, record_pass_scan.scanned_by)
      returning id
    )
    select made.id, holder, p.full_name_en, p.full_name_ar
    from made left join core.profiles p on p.id = holder;
end;
$$;

-- Who may scan Pass cards at all: door staff (by role or for an event) and
-- whoever runs the Typewriter Tour. The API asks before checking a code with
-- The IDEA.
create function private.can_scan_passes()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission_anywhere('events.checkin')
    or exists (select 1 from events.event_staff s where s.user_id = (select auth.uid()))
    or private.runs_the_tour();
$$;

-- The member a scan names, spent once by the officer who made it.
create function private.use_pass_scan(scan uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  holder uuid;
begin
  update access.pass_scans s set used_at = now()
  where s.id = use_pass_scan.scan
    and s.scanned_by = (select auth.uid())
    and s.used_at is null
    and s.created_at > now() - interval '2 minutes'
  returning s.holder into holder;
  if holder is null then
    raise exception 'scan_expired' using errcode = 'P0002';
  end if;
  return holder;
end;
$$;

-- ── The door ────────────────────────────────────────────────────────────────

create function private.check_in_pass(event_id uuid, scan uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, already boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_check_in(check_in_pass.event_id) then
    raise exception 'events.checkin is required for this event' using errcode = '42501';
  end if;
  return query select * from private.check_in(
    check_in_pass.event_id, null, private.use_pass_scan(check_in_pass.scan));
end;
$$;

-- ── Six Words on the Tour ───────────────────────────────────────────────────

create function private.record_six_words_pass(words text, language text, scan uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer uuid;
  entry uuid;
begin
  if not private.runs_the_tour() then
    raise exception 'programmes.manage for the Typewriter Tour is required' using errcode = '42501';
  end if;
  writer := private.use_pass_scan(record_six_words_pass.scan);
  delete from programmes.six_words w where w.user_id = writer;
  insert into programmes.six_words (user_id, text, language, status, moderated_by, moderated_at, recorded_by)
  values (writer, regexp_replace(trim(words), '\s+', ' ', 'g'), record_six_words_pass.language,
    'approved', (select auth.uid()), now(), (select auth.uid()))
  returning id into entry;
  return entry;
end;
$$;

create function private.attach_six_words_pass(entry_id uuid, scan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer uuid;
begin
  if not private.runs_the_tour() then
    raise exception 'programmes.manage for the Typewriter Tour is required' using errcode = '42501';
  end if;
  writer := private.use_pass_scan(attach_six_words_pass.scan);
  delete from programmes.six_words w where w.user_id = writer and w.id <> attach_six_words_pass.entry_id;
  update programmes.six_words w set user_id = writer
  where w.id = attach_six_words_pass.entry_id and w.user_id is null;
  if not found then
    raise exception 'No unsigned card with this id' using errcode = 'P0002';
  end if;
end;
$$;

-- ── Signing in with the Pass retires SAL's card in Google Wallet ────────────

create or replace function private.pass_account(
  pass_sub text,
  verified_email text default null,
  student_until date default null,
  student_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  found uuid;
  other text;
begin
  update access.pass_links l
  set last_signed_in_at = now()
  where l.pass_sub = pass_account.pass_sub
  returning l.user_id into found;

  if found is null then
    select u.id into found from auth.users u
    where verified_email is not null
      and lower(u.email) = lower(verified_email)
    limit 1;
    if found is null then
      select u.id into found from auth.users u
      where pass_account.student_email is not null
        and private.is_auib_email(pass_account.student_email)
        and lower(u.email) = lower(pass_account.student_email)
      limit 1;
    end if;
    if found is null then
      return null;
    end if;
    select l.pass_sub into other from access.pass_links l where l.user_id = found;
    if other is not null then
      raise exception 'This account is linked to another IDEA Pass'
        using errcode = '23505';
    end if;
    insert into access.pass_links (user_id, pass_sub)
    values (found, pass_account.pass_sub);
  end if;

  perform private.pass_student(found, pass_account.student_until);
  -- The Pass is the card now: a Wallet pass for SAL's card goes.
  perform private.expire_wallet_passes(found);
  return found;
end;
$$;

create or replace function private.pass_link(
  pass_sub text,
  user_id uuid,
  student_until date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from access.pass_links l
    where (l.pass_sub = pass_link.pass_sub and l.user_id <> pass_link.user_id)
      or (l.user_id = pass_link.user_id and l.pass_sub <> pass_link.pass_sub)
  ) then
    raise exception 'This IDEA Pass or account is already linked'
      using errcode = '23505';
  end if;
  insert into access.pass_links (user_id, pass_sub)
  values (pass_link.user_id, pass_link.pass_sub)
  on conflict on constraint pass_links_pkey do update
    set last_signed_in_at = now();
  perform private.pass_student(pass_link.user_id, pass_link.student_until);
  perform private.expire_wallet_passes(pass_link.user_id);
end;
$$;

-- The card's picture, read at sign-in.
create function private.pass_card(pass_sub text, svg_en text default null, svg_ar text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update access.pass_links set
    card_svg_en = coalesce(pass_card.svg_en, card_svg_en),
    card_svg_ar = coalesce(pass_card.svg_ar, card_svg_ar),
    card_updated_at = now()
  where pass_links.pass_sub = pass_card.pass_sub;
$$;

-- ── The names the apps call ─────────────────────────────────────────────────

create function access.record_pass_scan(pass_sub text, scanned_by uuid)
returns table (scan uuid, user_id uuid, full_name_en text, full_name_ar text)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.record_pass_scan($1, $2) $$;

create function access.pass_card(pass_sub text, svg_en text default null, svg_ar text default null)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.pass_card($1, $2, $3) $$;

create function access.can_scan_passes()
returns boolean
language sql stable
security invoker
set search_path = ''
as $$ select private.can_scan_passes() $$;

create function events.check_in_pass(event_id uuid, scan uuid)
returns table (user_id uuid, full_name_en text, full_name_ar text, already boolean)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.check_in_pass($1, $2) $$;

create function programmes.record_six_words_pass(words text, language text, scan uuid)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.record_six_words_pass($1, $2, $3) $$;

create function programmes.attach_six_words_pass(entry_id uuid, scan uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.attach_six_words_pass($1, $2) $$;

revoke all on function private.record_pass_scan(text, uuid), private.pass_card(text, text, text),
  private.use_pass_scan(uuid), private.check_in_pass(uuid, uuid), private.can_scan_passes(),
  private.record_six_words_pass(text, text, uuid), private.attach_six_words_pass(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.record_pass_scan(text, uuid), private.pass_card(text, text, text)
  to service_role;
grant execute on function private.use_pass_scan(uuid), private.check_in_pass(uuid, uuid), private.can_scan_passes(),
  private.record_six_words_pass(text, text, uuid), private.attach_six_words_pass(uuid, uuid)
  to authenticated, service_role;

revoke all on function access.record_pass_scan(text, uuid), access.pass_card(text, text, text)
  from public, anon, authenticated;
grant execute on function access.record_pass_scan(text, uuid), access.pass_card(text, text, text)
  to service_role;
revoke all on function access.can_scan_passes(), events.check_in_pass(uuid, uuid),
  programmes.record_six_words_pass(text, text, uuid), programmes.attach_six_words_pass(uuid, uuid)
  from public, anon;
grant execute on function access.can_scan_passes(), events.check_in_pass(uuid, uuid),
  programmes.record_six_words_pass(text, text, uuid), programmes.attach_six_words_pass(uuid, uuid)
  to authenticated, service_role;
