-- Accounts and sessions (decisions.md, Members): the devices signed in,
-- with "Sign out everywhere else"; an email when a sign-in comes from a
-- device the account hasn't used; deleting an account with a 30-day grace
-- period in which signing in restores it.

-- ── The devices signed in ────────────────────────────────────────────────

create function private.my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  last_seen timestamptz,
  user_agent text,
  current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.created_at, coalesce(s.refreshed_at, s.updated_at, s.created_at),
    s.user_agent, s.id::text = (select auth.jwt() ->> 'session_id')
  from auth.sessions s
  where s.user_id = (select auth.uid())
    and (s.not_after is null or s.not_after > now())
  order by 3 desc nulls last;
$$;

revoke all on function private.my_sessions() from public, anon;
grant execute on function private.my_sessions() to authenticated;

create function core.my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  last_seen timestamptz,
  user_agent text,
  current boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_sessions() $$;

revoke all on function core.my_sessions() from public, anon;
grant execute on function core.my_sessions() to authenticated;

-- ── A sign-in from an unfamiliar device ──────────────────────────────────

create table core.known_devices (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The browser and system with their version numbers taken out, hashed:
  -- the device's kind, not who it is.
  device text not null,
  first_seen timestamptz not null default now(),
  primary key (user_id, device)
);

alter table core.known_devices enable row level security;

create policy "No third-party apps" on core.known_devices
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

create policy "Each person sees their own devices" on core.known_devices
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on core.known_devices to authenticated;
grant all on core.known_devices to service_role;

comment on table core.known_devices is
  'The kinds of device each account has signed in from (a hash of the browser and system without versions), so a sign-in from a new one sends an email (decisions.md, Members).';

create function private.device_of(user_agent text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(
    regexp_replace(coalesce(user_agent, ''), '[0-9]+([._][0-9]+)*', '', 'g'), 'sha256'), 'hex');
$$;

-- Every five minutes: each new session from a kind of device the account
-- hasn't used is remembered, and the person is emailed unless it is the
-- account's first device.
create function private.note_new_devices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  n integer := 0;
  first boolean;
begin
  for s in
    select distinct on (x.user_id, private.device_of(x.user_agent))
      x.user_id, private.device_of(x.user_agent) as device, x.user_agent, x.created_at
    from auth.sessions x
    where x.created_at > now() - interval '15 minutes'
    order by x.user_id, private.device_of(x.user_agent), x.created_at
  loop
    if exists (select 1 from core.known_devices k
               where k.user_id = s.user_id and k.device = s.device) then
      continue;
    end if;
    first := not exists (select 1 from core.known_devices k where k.user_id = s.user_id);
    insert into core.known_devices (user_id, device) values (s.user_id, s.device)
    on conflict do nothing;
    if not first then
      perform private.enqueue('account.new_device', jsonb_build_object(
        'user_id', s.user_id, 'at', s.created_at, 'user_agent', left(s.user_agent, 300)));
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function private.note_new_devices() from public, anon, authenticated;

-- Everyone signed in now starts with the devices they use.
insert into core.known_devices (user_id, device)
select distinct s.user_id, private.device_of(s.user_agent) from auth.sessions s
on conflict do nothing;

select cron.schedule('sal-new-devices', '*/5 * * * *', $$ select private.note_new_devices() $$);

-- ── Deleting an account: 30 days to change one's mind ────────────────────

alter table core.profiles add column deletion_requested_at timestamptz;

comment on column core.profiles.deletion_requested_at is
  'When the person asked to delete the account; it is deleted 30 days later unless they sign in, which restores it (decisions.md, Members).';

grant select (deletion_requested_at) on core.profiles to authenticated;

create function private.restore_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  restored boolean;
begin
  update core.profiles set deletion_requested_at = null
  where id = (select auth.uid()) and deletion_requested_at is not null;
  get diagnostics restored = row_count;
  return restored;
end;
$$;

revoke all on function private.restore_account() from public, anon;
grant execute on function private.restore_account() to authenticated;

create function core.restore_account()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.restore_account() $$;

revoke all on function core.restore_account() from public, anon;
grant execute on function core.restore_account() to authenticated;

create function private.accounts_to_delete()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from core.profiles p
  where p.deletion_requested_at < now() - interval '30 days';
$$;

revoke all on function private.accounts_to_delete() from public, anon, authenticated;
grant execute on function private.accounts_to_delete() to service_role;

-- The retention job deletes the accounts whose 30 days are over, with the
-- guest accounts unused for two years.
create or replace function core.retention_due()
returns table (kind text, ref text)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'tour_photo', p from private.unclaimed_tour_photos() p
  union all
  select 'guest_account', g::text from private.idle_guest_accounts() g
  union all
  select 'deleted_account', a::text from private.accounts_to_delete() a;
$$;

create or replace function private.retention_schedule()
returns table (rule text, keeps text, runs text)
language sql
immutable
set search_path = ''
as $$
  values
    ('Unpublished Write for Qirtas submissions and their files', '12 months after the decision', null),
    ('Write for Qirtas drafts', '12 months after the last change', 'private.purge_stale_drafts'),
    ('Blind copies, assignments, scores and decisions of deleted submissions', '12 months', 'private.purge_blind_entries'),
    ('Invitation lists', '30 days after the list is sent', 'private.purge_tour_lists'),
    ('Unclaimed spring 2026 Tour pages', 'until the spring 2027 Tour (tour.unclaimed_until)', 'private.purge_unclaimed_tour_pages'),
    ('Associate membership requests', '1 year after the decision', 'private.purge_associate_requests'),
    ('Qalam consent forms (F-38, F-39) and the roster with attendance', '3 years after the program year', 'private.purge_qalam_records'),
    ('Incident records (F-16)', '7 years', 'private.purge_incident_records'),
    ('Ballots, ballot receipts and voter lists', '1 year after the vote closes', 'private.purge_expired_ballots'),
    ('Who voted for the Prize', '1 year after the vote closes', 'private.purge_prize_vote_receipts'),
    ('Get involved replies', '12 months after the last change', 'private.purge_opening_replies'),
    ('Removal requests', '2 years after closing', 'private.purge_removal_requests'),
    ('Unconfirmed Sunday Paper sign-ups', 'until the confirmation window closes', 'private.purge_unconfirmed_subscribers'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Push subscriptions and calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('Accounts their owners deleted', '30 days after the request, unless they sign in again', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports');
$$;

-- ── Renewal each September ───────────────────────────────────────────────
-- Members confirm "I'm still here" with one click and acknowledge the Code
-- of Conduct again; those who don't stay members but leave the active count
-- and Student Life's lists until they do (decisions.md, Members).

alter table membership.memberships add column renewed_at timestamptz;

comment on column membership.memberships.renewed_at is
  'When the member last confirmed "I''m still here" (each September, with the Code of Conduct). Null: not since joining.';

grant select (renewed_at) on membership.memberships to authenticated;

-- The latest September 1 in Baghdad: the start of the Society's year.
create function private.year_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select make_timestamptz(
    extract(year from (now() at time zone 'Asia/Baghdad'))::integer
      - case when extract(month from (now() at time zone 'Asia/Baghdad')) < 9 then 1 else 0 end,
    9, 1, 0, 0, 0, 'Asia/Baghdad');
$$;

-- Active: joined or renewed since this year began.
create function private.is_active_member(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from membership.memberships m
    where m.user_id = member
      and greatest(m.renewed_at, m.created_at) >= private.year_start()
  );
$$;

revoke all on function private.is_active_member(uuid) from public, anon;
grant execute on function private.is_active_member(uuid) to authenticated, service_role;

create function private.renewal_due()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from membership.memberships m where m.user_id = (select auth.uid()))
    and not private.is_active_member((select auth.uid()));
$$;

create function private.renew_membership()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  update membership.memberships set renewed_at = now() where user_id = me;
  if not found then
    raise exception 'Not a member' using errcode = '42501';
  end if;
  -- The Code of Conduct, acknowledged again with the renewal.
  update core.profiles set agreed_at = now() where id = me;
  return now();
end;
$$;

revoke all on function private.renewal_due() from public, anon;
revoke all on function private.renew_membership() from public, anon;
grant execute on function private.renewal_due() to authenticated;
grant execute on function private.renew_membership() to authenticated;

create function membership.renewal_due()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.renewal_due() $$;

create function membership.renew_membership()
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.renew_membership() $$;

revoke all on function membership.renewal_due() from public, anon;
revoke all on function membership.renew_membership() from public, anon;
grant execute on function membership.renewal_due() to authenticated;
grant execute on function membership.renew_membership() to authenticated;
