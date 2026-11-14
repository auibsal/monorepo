-- Addresses and classes (the owner, Nov 14, 2026; decisions.md, Members).
--
-- 1. Sign-ups never confirmed are deleted after seven days, so a mistyped
--    or abandoned address is free again. "Wrong address?" on the inbox
--    screen deletes the one just made at once (private.drop_unconfirmed_
--    sign_up), with the key only that browser holds.
-- 2. Moving the sign-in address (private.move_sign_in): the one place the
--    address changes, for the three steps below. The old and the new
--    address are both told.
-- 3. An AUIB address added later: someone who signed up with another
--    address (or a guest who comes to AUIB) adds it in Settings and types
--    the code sent to it; the Director of Membership may add it from the
--    Register. The AUIB address becomes the sign-in, the old one the
--    confirmed personal email, and the class follows the AUIB address.
-- 4. Leaving AUIB: the person says so in Settings, or the Director
--    records it, whichever comes first. They become an Associate (no vote,
--    no seat); a confirmed personal email becomes the sign-in, and until
--    there is one, Today asks for it.
-- 5. Two accounts, one person: from one account the person proves the
--    other's address with a code; the Director of Membership approves, and
--    the two become one. The account with the older number stays; the
--    other's records move onto it.

-- ── Codes ───────────────────────────────────────────────────────────────
-- Six digits from the random generator, for codes typed in by hand.
create function private.six_digit_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select lpad(
    (('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text,
    6, '0');
$$;
revoke all on function private.six_digit_code() from public, anon, authenticated;

-- ── 1. Sign-ups never confirmed ─────────────────────────────────────────
create function private.purge_unconfirmed_sign_ups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.users u
  where u.email_confirmed_at is null
    and u.last_sign_in_at is null
    and u.created_at < now() - interval '7 days'
    and not exists (select 1 from access.role_assignments r where r.user_id = u.id);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function private.purge_unconfirmed_sign_ups() from public, anon, authenticated;
grant execute on function private.purge_unconfirmed_sign_ups() to service_role;

-- "Wrong address?": the browser that made the sign-up holds a random key,
-- whose hash went with it (sign_up_key); with it, the unconfirmed account
-- made in the last day is deleted, and the person signs up again at the
-- right address. Called by POST /api/sign-up/wrong-address (rate limited).
create function private.drop_unconfirmed_sign_up(email text, sign_up_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if coalesce(char_length(sign_up_key), 0) < 32 then
    return false;
  end if;
  delete from auth.users u
  where lower(u.email) = lower(btrim(drop_unconfirmed_sign_up.email))
    and u.email_confirmed_at is null
    and u.last_sign_in_at is null
    and u.created_at > now() - interval '1 day'
    and u.raw_user_meta_data ->> 'sign_up_key'
      = encode(extensions.digest(sign_up_key, 'sha256'), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
revoke all on function private.drop_unconfirmed_sign_up(text, text) from public, anon, authenticated;
grant execute on function private.drop_unconfirmed_sign_up(text, text) to service_role;

create function core.drop_unconfirmed_sign_up(email text, sign_up_key text)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$ select private.drop_unconfirmed_sign_up(email, sign_up_key) $$;
revoke all on function core.drop_unconfirmed_sign_up(text, text) from public, anon, authenticated;
grant execute on function core.drop_unconfirmed_sign_up(text, text) to service_role;

create or replace function private.retention_schedule()
 RETURNS TABLE(rule text, keeps text, runs text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  values
    ('Unpublished Write for Qirtas submissions and their files', '12 months after the decision', null),
    ('Write for Qirtas drafts', '12 months after the last change', 'private.purge_stale_drafts'),
    ('Blind copies, assignments, scores and decisions of deleted submissions', '12 months', 'private.purge_blind_entries'),
    ('Invitation lists', '30 days after the list is sent', 'private.purge_tour_lists'),
    ('Unclaimed spring 2026 Tour pages', 'until the spring 2027 Tour (tour.unclaimed_until)', 'private.purge_unclaimed_tour_pages'),
    ('Associate membership requests', '1 year after the decision', 'private.purge_associate_requests'),
    ('Qalam consent forms (F-38, F-39) and the roster with attendance', '3 years after the program year', 'private.purge_qalam_records'),
    ('Incident records', '2 years after the case closes (Qalam''s: 7 years)', 'private.purge_incident_records'),
    ('Ballots, ballot receipts and voter lists', '1 year after the vote closes', 'private.purge_expired_ballots'),
    ('Who voted for the Prize', '1 year after the vote closes', 'private.purge_prize_vote_receipts'),
    ('Get involved replies', '12 months after the last change', 'private.purge_opening_replies'),
    ('Removal requests', '2 years after closing', 'private.purge_removal_requests'),
    ('Unconfirmed Sunday Paper sign-ups', 'until the confirmation window closes', 'private.purge_unconfirmed_subscribers'),
    ('Sign-ups never confirmed', '7 days', 'private.purge_unconfirmed_sign_ups'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Codes for a new AUIB address or a merge', '1 day', 'private.purge_address_codes'),
    ('Requests to merge two accounts', '1 year after the decision', 'private.purge_merge_requests'),
    ('Calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('Accounts their owners deleted', '30 days after the request, unless they sign in again', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports'),
    ('Trip emergency contacts and health notes (F-45)', '7 days after the trip', 'private.purge_trip_contacts');
$function$;

-- ── 2. Moving the sign-in address ───────────────────────────────────────
-- The address and the email identity together, past keep_auib_address
-- (which stops the account changing an AUIB address itself). Both
-- addresses are told.
create function private.move_sign_in(uid uuid, address text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_address text;
  new_address text := lower(btrim(address));
begin
  select lower(u.email) into old_address from auth.users u where u.id = uid for update;
  if not found then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  if old_address = new_address then
    return;
  end if;
  perform set_config('sal.allow_email_change', 'on', true);
  update auth.users
  set email = new_address, email_change = '', updated_at = now()
  where id = uid;
  update auth.identities
  set identity_data = identity_data
      || jsonb_build_object('email', new_address, 'email_verified', true),
    updated_at = now()
  where user_id = uid and provider = 'email';
  perform set_config('sal.allow_email_change', '', true);
  perform private.enqueue('account.sign_in_moved', jsonb_build_object(
    'user_id', uid, 'from', old_address, 'to', new_address, 'reason', reason));
end;
$$;
revoke all on function private.move_sign_in(uuid, text, text) from public, anon, authenticated;

-- The class from the sign-in address (decisions.md, Members): a student's
-- AUIB address is a Member's, any other AUIB address an Associate's. An
-- Honorary Member stays one. A guest who now holds an AUIB address is a
-- guest no longer.
create function private.class_from_sign_in(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  address text := (select lower(u.email) from auth.users u where u.id = uid);
begin
  if not private.is_auib_email(address) then
    return;
  end if;
  perform private.verify_user(uid);
  if private.is_student_address(address) then
    update membership.memberships
    set tier = 'member', left_auib_at = null, left_graduated = null
    where user_id = uid and (tier <> 'member' or left_auib_at is not null);
  else
    update membership.memberships set tier = 'associate'
    where user_id = uid and tier = 'member';
  end if;
  update membership.guests set ended_at = now()
  where user_id = uid and ended_at is null;
  update membership.verification_requests
  set status = 'approved', decided_at = now(), decision_note = 'AUIB address confirmed'
  where user_id = uid and status = 'pending';
  perform private.enqueue('wallet.refresh', jsonb_build_object('user_id', uid));
end;
$$;
revoke all on function private.class_from_sign_in(uuid) from public, anon, authenticated;

-- ── 3. An AUIB address added later ──────────────────────────────────────
create table core.address_codes (
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('auib_address', 'merge')),
  email text not null check (email = lower(btrim(email))),
  code text not null check (code ~ '^[0-9]{6}$'),
  tries integer not null default 0,
  requested_at timestamptz not null default now(),
  primary key (user_id, purpose)
);

comment on table core.address_codes is
  'A code sent to an address the person says is theirs: a new AUIB address, or another account''s address to merge. Six digits, one hour, five tries. Reached only through functions.';

alter table core.address_codes enable row level security;
revoke all on core.address_codes from anon, authenticated;
grant all on core.address_codes to service_role;

create policy "No third-party apps" on core.address_codes
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

-- Send (or send again) a code to an address the person says is theirs.
create function private.send_address_code(uid uuid, kind text, address text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from core.address_codes c
    where c.user_id = uid and c.purpose = send_address_code.kind
      and c.requested_at > now() - interval '1 minute'
  ) then
    raise exception 'too_soon' using errcode = '22023';
  end if;
  insert into core.address_codes (user_id, purpose, email, code)
  values (uid, send_address_code.kind, address, private.six_digit_code())
  on conflict (user_id, purpose) do update
    set email = excluded.email, code = excluded.code, tries = 0, requested_at = now();
  perform private.enqueue('address.code', jsonb_build_object('user_id', uid, 'purpose', send_address_code.kind));
end;
$$;
revoke all on function private.send_address_code(uuid, text, text) from public, anon, authenticated;

-- Check a typed code; returns the address it proves, or raises
-- invalid_code (wrong, older than an hour, or after five tries).
create function private.take_address_code(uid uuid, kind text, typed text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending core.address_codes;
begin
  select * into pending from core.address_codes c
  where c.user_id = uid and c.purpose = take_address_code.kind
  for update;
  if not found or pending.requested_at < now() - interval '1 hour' or pending.tries >= 5 then
    raise exception 'invalid_code' using errcode = '22023';
  end if;
  if pending.code <> regexp_replace(coalesce(typed, ''), '\s', '', 'g') then
    update core.address_codes set tries = tries + 1
    where user_id = uid and purpose = take_address_code.kind;
    raise exception 'invalid_code' using errcode = '22023';
  end if;
  delete from core.address_codes where user_id = uid and purpose = take_address_code.kind;
  return pending.email;
end;
$$;
revoke all on function private.take_address_code(uuid, text, text) from public, anon, authenticated;

-- Whether an AUIB address can be added to this account: an AUIB address,
-- nobody's sign-in (another account there is a merge instead) and nobody's
-- personal email.
create function private.check_new_auib_address(uid uuid, address text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or not private.is_auib_email(address) then
    raise exception 'email_not_auib' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = address and u.id <> uid) then
    raise exception 'email_has_account' using errcode = '23505';
  end if;
  if exists (
    select 1 from core.profiles p
    where lower(p.personal_email) = address and p.personal_email_verified_at is not null
      and p.id <> uid
  ) then
    raise exception 'email_in_use' using errcode = '23505';
  end if;
end;
$$;
revoke all on function private.check_new_auib_address(uuid, text) from public, anon, authenticated;

-- The AUIB address becomes the sign-in; the old address, the confirmed
-- personal email; the class follows the AUIB address.
create function private.adopt_auib_address(uid uuid, address text, reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_address text := (select lower(u.email) from auth.users u where u.id = uid);
begin
  perform private.check_new_auib_address(uid, address);
  update core.profiles set personal_email = null, personal_email_verified_at = null
  where id = uid;
  delete from core.personal_email_requests where user_id = uid;
  perform private.move_sign_in(uid, address, reason);
  if not private.is_auib_email(old_address) then
    update core.profiles set personal_email = old_address, personal_email_verified_at = now()
    where id = uid;
  end if;
  perform private.class_from_sign_in(uid);
  return (select m.tier::text from membership.memberships m where m.user_id = uid);
end;
$$;
revoke all on function private.adopt_auib_address(uuid, text, text) from public, anon, authenticated;

-- The person, from Settings: send the code to the AUIB address.
create function private.request_auib_address(email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  address text := lower(btrim(request_auib_address.email));
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if private.is_auib_email((select u.email from auth.users u where u.id = uid)) then
    raise exception 'already_auib' using errcode = '22023';
  end if;
  perform private.check_new_auib_address(uid, address);
  perform private.send_address_code(uid, 'auib_address', address);
end;
$$;

-- And the code typed in: returns the class now held.
create function private.confirm_auib_address(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  address text;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  address := private.take_address_code(uid, 'auib_address', code);
  return private.adopt_auib_address(uid, address, 'auib_address');
end;
$$;

-- The Director of Membership, from the Register, for someone who has
-- shown them the address.
create function private.set_auib_address(member uuid, email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('members.manage') then
    raise exception 'The Director of Membership adds an AUIB address' using errcode = '42501';
  end if;
  if private.is_auib_email((select u.email from auth.users u where u.id = member)) then
    raise exception 'already_auib' using errcode = '22023';
  end if;
  return private.adopt_auib_address(member, lower(btrim(email)), 'membership');
end;
$$;

-- ── 4. Leaving AUIB ─────────────────────────────────────────────────────
alter table membership.memberships
  add column left_auib_at timestamptz,
  add column left_graduated boolean;

comment on column membership.memberships.left_auib_at is
  'When the person left AUIB (said in Settings or recorded by Membership). Until a confirmed personal email becomes the sign-in, Today asks for one.';
comment on column membership.memberships.left_graduated is
  'Whether they graduated when they left (for the record; the class is Associate either way).';

-- A confirmed personal email becomes the sign-in of someone who left.
create function private.sign_in_after_leaving(uid uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  personal text;
begin
  select lower(p.personal_email) into personal from core.profiles p
  where p.id = uid and p.personal_email is not null and p.personal_email_verified_at is not null;
  if personal is null
    or not exists (select 1 from membership.memberships m where m.user_id = uid and m.left_auib_at is not null)
    or not private.is_auib_email((select u.email from auth.users u where u.id = uid))
  then
    return false;
  end if;
  perform private.move_sign_in(uid, personal, 'left_auib');
  update core.profiles set personal_email = null, personal_email_verified_at = null where id = uid;
  return true;
end;
$$;
revoke all on function private.sign_in_after_leaving(uuid) from public, anon, authenticated;

create function private.leave_auib(member uuid, graduated boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m membership.memberships;
begin
  if graduated is null then
    raise exception 'Say whether they graduated' using errcode = '22023';
  end if;
  select * into m from membership.memberships where user_id = member for update;
  if not found or m.tier <> 'member' then
    raise exception 'not_a_student_member' using errcode = 'P0002';
  end if;

  -- Office goes with the student class, either way.
  update access.role_assignments
  set ends_at = now()
  where user_id = member and starts_at < now() and (ends_at is null or ends_at > now());
  delete from access.role_assignments
  where user_id = member and starts_at >= now();

  -- Graduates and leavers alike become Associates: the same account,
  -- number and history; no vote and no seat; the members' group stays.
  update membership.memberships
  set tier = 'associate', left_auib_at = now(), left_graduated = graduated
  where user_id = member;
  perform private.sign_in_after_leaving(member);
  perform private.enqueue('wallet.refresh', jsonb_build_object('user_id', member));
  return 'associate';
end;
$$;
revoke all on function private.leave_auib(uuid, boolean) from public, anon, authenticated;

create or replace function private.record_departure(member uuid, graduated boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.has_permission('members.manage') then
    raise exception 'The Director of Membership records who left' using errcode = '42501';
  end if;
  return private.leave_auib(member, graduated);
end;
$function$;

-- The person themself, from Settings.
create function private.report_leaving(graduated boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  return private.leave_auib((select auth.uid()), graduated);
end;
$$;

-- A personal email confirmed after leaving becomes the sign-in at once.
create or replace function private.confirm_personal_email(token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending core.personal_email_requests;
begin
  select * into pending from core.personal_email_requests r
  where r.token = confirm_personal_email.token
    and r.requested_at > now() - interval '7 days';
  if not found then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if private.email_taken(pending.email, pending.user_id) then
    delete from core.personal_email_requests where user_id = pending.user_id;
    raise exception 'email_in_use' using errcode = '23505';
  end if;
  update core.profiles
  set personal_email = pending.email, personal_email_verified_at = now()
  where id = pending.user_id;
  delete from core.personal_email_requests where user_id = pending.user_id;
  if private.sign_in_after_leaving(pending.user_id) then
    return 'signed_in';
  end if;
  return 'confirmed';
end;
$$;

-- ── 5. Two accounts, one person ─────────────────────────────────────────
create table membership.merge_requests (
  id uuid primary key default gen_random_uuid(),
  -- The account that asked, and the other one, proven by its code.
  user_id uuid references auth.users (id) on delete set null,
  other_id uuid references auth.users (id) on delete set null,
  other_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  -- The account that stayed (approved).
  kept_id uuid references auth.users (id) on delete set null
);

comment on table membership.merge_requests is
  'Someone asking to make two accounts one, having proven both addresses; the Director of Membership approves (decisions.md, Members). Reached only through functions.';

create index merge_requests_user_id_idx on membership.merge_requests (user_id);
create index merge_requests_other_id_idx on membership.merge_requests (other_id);
create index merge_requests_decided_by_idx on membership.merge_requests (decided_by);
create index merge_requests_kept_id_idx on membership.merge_requests (kept_id);
create unique index merge_requests_one_open on membership.merge_requests (user_id)
  where status = 'pending';

alter table membership.merge_requests enable row level security;
revoke all on membership.merge_requests from anon, authenticated;
grant all on membership.merge_requests to service_role;

create policy "No third-party apps" on membership.merge_requests
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

create function private.purge_address_codes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from core.address_codes where requested_at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function private.purge_address_codes() from public, anon, authenticated;

create function private.purge_merge_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from membership.merge_requests
  where status <> 'pending' and decided_at < now() - interval '1 year';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function private.purge_merge_requests() from public, anon, authenticated;
grant execute on function private.purge_merge_requests() to service_role;
grant execute on function private.purge_address_codes() to service_role;

-- Ask: a code to the other account's address.
create function private.request_merge(email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  address text := lower(btrim(request_merge.email));
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u
    where lower(u.email) = address and u.id <> uid and u.email_confirmed_at is not null
  ) then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  if exists (select 1 from membership.merge_requests r where r.user_id = uid and r.status = 'pending') then
    raise exception 'merge_pending' using errcode = '23505';
  end if;
  perform private.send_address_code(uid, 'merge', address);
end;
$$;

-- The code typed in: the request goes to the Director of Membership.
create function private.prove_merge(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  address text;
  other uuid;
  request uuid;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  address := private.take_address_code(uid, 'merge', code);
  select u.id into other from auth.users u where lower(u.email) = address and u.id <> uid;
  if other is null then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  insert into membership.merge_requests (user_id, other_id, other_email)
  values (uid, other, address)
  returning id into request;
  perform private.enqueue('merge.requested', jsonb_build_object('request_id', request));
  return request;
end;
$$;

-- Withdraw a request still waiting.
create function private.withdraw_merge()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from membership.merge_requests
  where user_id = (select auth.uid()) and status = 'pending';
$$;

-- Which of two accounts stays: the older number; else the older
-- membership; else the older account.
create function private.older_account(a uuid, b uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  left join membership.cards c on c.user_id = u.id
  left join membership.memberships m on m.user_id = u.id
  where u.id in (a, b)
  order by c.number nulls last, m.created_at nulls last, u.created_at, u.id
  limit 1;
$$;
revoke all on function private.older_account(uuid, uuid) from public, anon, authenticated;

-- Make two accounts one. Every record of the other account that points at
-- the person moves to the one that stays; where the one that stays already
-- has the same record (one RSVP per event, one card), the other's copy is
-- dropped. Then the other account is deleted, and its address kept: an
-- AUIB address becomes the sign-in, any other the personal email.
create function private.merge_accounts(a uuid, b uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep uuid := private.older_account(a, b);
  gone uuid;
  keep_address text;
  gone_address text;
  fk record;
  row_id tid;
begin
  if keep is null or a = b then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  gone := case when keep = a then b else a end;
  select lower(email) into keep_address from auth.users where id = keep;
  select lower(email) into gone_address from auth.users where id = gone;

  for fk in
    select n.nspname as schema_name, t.relname as table_name, att.attname as column_name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_attribute att on att.attrelid = c.conrelid and att.attnum = c.conkey[1]
    where c.contype = 'f'
      and array_length(c.conkey, 1) = 1
      and c.confrelid in ('auth.users'::regclass, 'core.profiles'::regclass)
      and n.nspname not in ('auth', 'storage', 'realtime', 'supabase_functions', 'vault', 'extensions')
      and not (n.nspname = 'core' and t.relname = 'profiles')
      and not (n.nspname = 'membership' and t.relname = 'merge_requests')
  loop
    for row_id in execute format('select ctid from %I.%I where %I = $1', fk.schema_name, fk.table_name, fk.column_name)
      using gone
    loop
      begin
        execute format('update %I.%I set %I = $1 where ctid = $2', fk.schema_name, fk.table_name, fk.column_name)
          using keep, row_id;
      exception when unique_violation or exclusion_violation then
        execute format('delete from %I.%I where ctid = $1', fk.schema_name, fk.table_name)
          using row_id;
      end;
    end loop;
  end loop;

  delete from core.personal_email_requests where user_id = gone;
  delete from auth.users where id = gone;

  if private.is_auib_email(gone_address) and not private.is_auib_email(keep_address) then
    update core.profiles set personal_email = null, personal_email_verified_at = null where id = keep;
    perform private.move_sign_in(keep, gone_address, 'merge');
    update core.profiles set personal_email = keep_address, personal_email_verified_at = now()
    where id = keep;
  elsif not private.is_auib_email(gone_address) then
    update core.profiles set personal_email = gone_address, personal_email_verified_at = now()
    where id = keep and personal_email_verified_at is null;
  end if;
  perform private.class_from_sign_in(keep);
  perform private.enqueue('wallet.refresh', jsonb_build_object('user_id', keep));
  return keep;
end;
$$;
revoke all on function private.merge_accounts(uuid, uuid) from public, anon, authenticated;

-- The Director of Membership approves or declines.
create function private.decide_merge(request uuid, approve boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  req membership.merge_requests;
  kept uuid;
begin
  if not private.has_permission('members.manage') then
    raise exception 'The Director of Membership decides merges' using errcode = '42501';
  end if;
  select * into req from membership.merge_requests where id = request and status = 'pending' for update;
  if not found or req.user_id is null or req.other_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if approve then
    kept := private.merge_accounts(req.user_id, req.other_id);
  end if;
  update membership.merge_requests
  set status = case when approve then 'approved' else 'declined' end,
    decided_by = (select auth.uid()), decided_at = now(), kept_id = kept
  where id = request;
  perform private.enqueue('merge.decided', jsonb_build_object(
    'request_id', request, 'user_id', coalesce(kept, req.user_id), 'approved', approve));
  return kept;
end;
$$;

-- What the Director sees: each waiting request, both accounts side by side.
create function private.merge_requests()
returns table (
  id uuid, requested_at timestamptz,
  user_id uuid, user_name text, user_email text, user_number integer, user_class text,
  other_id uuid, other_name text, other_email text, other_number integer, other_class text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.requested_at,
    r.user_id, pa.full_name_en, ua.email::text, ca.number, private.membership_kind(r.user_id),
    r.other_id, pb.full_name_en, ub.email::text, cb.number, private.membership_kind(r.other_id)
  from membership.merge_requests r
  join auth.users ua on ua.id = r.user_id
  join auth.users ub on ub.id = r.other_id
  left join core.profiles pa on pa.id = r.user_id
  left join core.profiles pb on pb.id = r.other_id
  left join membership.cards ca on ca.user_id = r.user_id
  left join membership.cards cb on cb.user_id = r.other_id
  where r.status = 'pending' and private.has_permission('members.manage')
  order by r.requested_at;
$$;

-- ── What Settings shows ────────────────────────────────────────────────
create function private.my_addresses()
returns table (
  sign_in text, sign_in_auib boolean, student boolean, tier text, left_auib_at timestamptz,
  personal_verified boolean, auib_pending text, merge_pending text, merge_code_sent text
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text, private.is_auib_email(u.email), private.is_student_address(u.email),
    m.tier::text, m.left_auib_at,
    p.personal_email is not null and p.personal_email_verified_at is not null,
    (select c.email from core.address_codes c
     where c.user_id = u.id and c.purpose = 'auib_address' and c.requested_at > now() - interval '1 hour'),
    (select r.other_email from membership.merge_requests r where r.user_id = u.id and r.status = 'pending'),
    (select c.email from core.address_codes c
     where c.user_id = u.id and c.purpose = 'merge' and c.requested_at > now() - interval '1 hour')
  from auth.users u
  left join core.profiles p on p.id = u.id
  left join membership.memberships m on m.user_id = u.id
  where u.id = (select auth.uid());
$$;

-- ── The names the apps call ─────────────────────────────────────────────
create function core.my_addresses()
returns table (
  sign_in text, sign_in_auib boolean, student boolean, tier text, left_auib_at timestamptz,
  personal_verified boolean, auib_pending text, merge_pending text, merge_code_sent text
)
language sql stable security invoker set search_path = ''
as $$ select * from private.my_addresses() $$;

create function core.request_auib_address(email text)
returns void
language sql volatile security invoker set search_path = ''
as $$ select private.request_auib_address(email) $$;

create function core.confirm_auib_address(code text)
returns text
language sql volatile security invoker set search_path = ''
as $$ select private.confirm_auib_address(code) $$;

create function core.report_leaving(graduated boolean)
returns text
language sql volatile security invoker set search_path = ''
as $$ select private.report_leaving(graduated) $$;

create function core.request_merge(email text)
returns void
language sql volatile security invoker set search_path = ''
as $$ select private.request_merge(email) $$;

create function core.prove_merge(code text)
returns uuid
language sql volatile security invoker set search_path = ''
as $$ select private.prove_merge(code) $$;

create function core.withdraw_merge()
returns void
language sql volatile security invoker set search_path = ''
as $$ select private.withdraw_merge() $$;

create function membership.set_auib_address(member uuid, email text)
returns text
language sql volatile security invoker set search_path = ''
as $$ select private.set_auib_address(member, email) $$;

create function membership.decide_merge(request uuid, approve boolean)
returns uuid
language sql volatile security invoker set search_path = ''
as $$ select private.decide_merge(request, approve) $$;

create function membership.merge_requests()
returns table (
  id uuid, requested_at timestamptz,
  user_id uuid, user_name text, user_email text, user_number integer, user_class text,
  other_id uuid, other_name text, other_email text, other_number integer, other_class text
)
language sql stable security invoker set search_path = ''
as $$ select * from private.merge_requests() $$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'private.my_addresses()', 'private.request_auib_address(text)',
    'private.confirm_auib_address(text)', 'private.report_leaving(boolean)',
    'private.request_merge(text)', 'private.prove_merge(text)', 'private.withdraw_merge()',
    'private.set_auib_address(uuid, text)', 'private.decide_merge(uuid, boolean)',
    'private.merge_requests()',
    'core.my_addresses()', 'core.request_auib_address(text)',
    'core.confirm_auib_address(text)', 'core.report_leaving(boolean)',
    'core.request_merge(text)', 'core.prove_merge(text)', 'core.withdraw_merge()',
    'membership.set_auib_address(uuid, text)', 'membership.decide_merge(uuid, boolean)',
    'membership.merge_requests()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;
