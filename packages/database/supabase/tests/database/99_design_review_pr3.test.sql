-- The design review, PR 3 (Nov 4, 2026): every decision on work sent to
-- Qirtas carries its reason (C25), blind or named; the Desk's handover
-- (A39) is for officers and names who owns what waits.
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
-- </preamble>

select plan(9);

select throws_ok(
  $$ select journal.decide(gen_random_uuid(), 'accept') $$,
  '22023', 'A decision needs its reason',
  'a blind decision without a reason is refused'
);
select throws_ok(
  $$ select journal.decide(gen_random_uuid(), 'decline', '   ') $$,
  '22023', 'A decision needs its reason',
  'a blank reason is no reason'
);
select throws_ok(
  $$ select journal.decide_named(gen_random_uuid(), 'accept') $$,
  '22023', 'A decision needs its reason',
  'a named decision without a reason is refused'
);
select throws_ok(
  $$ select journal.decide(gen_random_uuid(), 'accept', 'Strong craft') $$,
  '42501', null,
  'with a reason, the permission check still decides'
);

-- ── A39: the handover ──────────────────────────────────────────────────────
select pg_temp.make_user('00000000-0000-0000-0000-00000000a391', 'a391@auib.edu.iq', 'Handover Member');
select pg_temp.make_user('00000000-0000-0000-0000-00000000a392', 'a392@auib.edu.iq', 'Handover Officer');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000a392', 'general_secretary');

select pg_temp.login_as('00000000-0000-0000-0000-00000000a391');
select throws_ok(
  $$ select * from core.handover() $$,
  '42501', null,
  'a member without a role does not read the handover'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a392');
select is(
  (select count(*)::int from core.handover()),
  6,
  'an officer reads the six things that wait'
);
select is(
  (select array_agg(item order by item) from core.handover()),
  array['grants_asked', 'hiring_new', 'partner_applications', 'perks_waiting', 'requests_open', 'submissions_new'],
  'each by its key'
);
select ok(
  (select jsonb_array_length(owners) >= 1
     from core.handover() where item = 'hiring_new'),
  'replies to openings are owned by whoever holds members.manage'
);
select pg_temp.logout();
select ok(
  not has_function_privilege('anon', 'core.handover()', 'execute'),
  'visitors cannot call it'
);

select * from finish();
rollback;
