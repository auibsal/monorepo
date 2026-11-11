-- Accounts: sessions, new devices, deleting with grace, renewal (migration 20261113000500).
begin;
-- <preamble>
-- Shared pgTAP preamble. Each test file includes a copy (pg_prove runs files
-- in isolation); keep them identical. `bun run --cwd packages/database db:test:sync` rewrites them.
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

create function pg_temp.login_as(uid uuid, extra jsonb default '{}')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config(
    'request.jwt.claims',
    -- aal2 by default (two-step sign-in done); pass '{"aal":"aal1"}' to test without it.
    (jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2') || extra)::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

create function pg_temp.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- A confirmed account. AUIB addresses are verified by the sign-up trigger.
create function pg_temp.make_user(uid uuid, email text, name text default 'Test User')
returns uuid
language sql
as $$
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
  values (uid, email, now(), jsonb_build_object('full_name_en', name), 'authenticated', 'authenticated')
  returning id;
$$;

create function pg_temp.grant_role(uid uuid, role_key text, kind text default 'global', scope uuid default null)
returns void
language sql
as $$
  insert into access.role_assignments (user_id, role, scope_type, scope_id)
  values (uid, role_key, kind, scope);
$$;

grant execute on all functions in schema pg_temp to public;

-- Semesters around today: older, previous, current.
insert into core.semesters (code, name_en, name_ar, starts_on, ends_on) values
  ('fall-2024', 'Older', 'أقدم', current_date - 420, current_date - 300),
  ('spring-2025', 'Previous', 'السابق', current_date - 200, current_date - 60),
  ('fall-2025', 'Current', 'الحالي', current_date - 30, current_date + 60);

-- Tests check the two-activity rule; the founding-voter tests turn the
-- first-100 rule back on themselves.
update core.settings set value = '0' where key = 'membership.founding_voters';

-- An adopted Council resolution, with its minutes: the Council's vote that
-- approves a partnership (decisions §10).
create function pg_temp.council_resolution(
  id uuid default '00000000-0000-0000-0000-0000000c0001',
  code text default 'R-2026-99'
)
returns uuid
language sql
as $$
  with m as (
    insert into governance.minutes (title_en, text_en, meeting_on, body, status, adopted_on)
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'approved', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

select plan(10);

select pg_temp.make_user('00000000-0000-0000-0000-00000000ac01', 'acct-a@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ac02', 'acct-b@auib.edu.iq');

select is(
  private.device_of('Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.6723.58 Safari/537.36'),
  private.device_of('Mozilla/5.0 (Windows NT 11.0) Chrome/131.0.1.2 Safari/537.36'),
  'A browser update is the same device');
select isnt(
  private.device_of('Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36'),
  private.device_of('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Safari/604.1'),
  'A phone is another device');

-- A first device is remembered quietly; a second one sends an email.
insert into auth.sessions (id, user_id, created_at, updated_at, user_agent)
values (gen_random_uuid(), '00000000-0000-0000-0000-00000000ac01', now(), now(), 'Firefox/130.0 (Windows)');
select is(private.note_new_devices(), 0, 'The first device sends no email');
insert into auth.sessions (id, user_id, created_at, updated_at, user_agent)
values (gen_random_uuid(), '00000000-0000-0000-0000-00000000ac01', now(), now(), 'Safari (iPhone)');
select is(private.note_new_devices(), 1, 'A new kind of device sends one email');
select is((select count(*)::integer from core.outbox where kind = 'account.new_device'), 1, 'queued');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac01');
select is((select count(*)::integer from core.my_sessions()), 2, 'The person sees their devices signed in');
select pg_temp.login_as('00000000-0000-0000-0000-00000000ac02');
select is((select count(*)::integer from core.my_sessions()), 0, 'and nobody else sees them');
select pg_temp.logout();

-- Deleting: 30 days, and signing in restores the account.
update core.profiles set deletion_requested_at = now() - interval '31 days'
where id = '00000000-0000-0000-0000-00000000ac02';
select ok('00000000-0000-0000-0000-00000000ac02' in (select private.accounts_to_delete()),
  'After 30 days the retention job deletes it');
select pg_temp.login_as('00000000-0000-0000-0000-00000000ac02');
select is(core.restore_account(), true, 'Signing in before then restores it');
select pg_temp.logout();
select is((select deletion_requested_at from core.profiles where id = '00000000-0000-0000-0000-00000000ac02'),
  null, 'and it is no longer due');

select * from finish();
rollback;
