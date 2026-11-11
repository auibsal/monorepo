-- Membership: sign-up verification, pledges, profile visibility and the
-- voting member rule (decisions.md: two events or general meetings in
-- the academic year, from September 1).
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

select plan(23);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'student@auib.edu.iq', 'Student');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000b1', 'alum@gmail.com', 'Alum');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'second@AUIB.EDU.IQ', 'Second');

-- Unconfirmed AUIB address: not verified until confirmed.
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000a3', 'pending@auib.edu.iq', 'authenticated', 'authenticated');

-- ── Verification ────────────────────────────────────────────────────────────

select ok(
  (select verified_at is not null from core.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'A confirmed AUIB address is verified at sign-up'
);
select ok(
  (select verified_at is not null from core.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'The AUIB domain check ignores case'
);
select ok(
  (select verified_at is null from core.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
  'Another domain is not verified at sign-up'
);
select is(
  (select count(*) from membership.verification_requests where user_id = '00000000-0000-0000-0000-0000000000b1')::integer,
  0,
  'Another domain opens no request in the Society''s queue (partners verify their own)'
);
-- A request from before partners verified their own stays decidable.
insert into membership.verification_requests (user_id, email)
values ('00000000-0000-0000-0000-0000000000b1', 'alum@gmail.com');
select ok(
  (select verified_at is null from core.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  'An unconfirmed AUIB address is not verified'
);

update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000a3';
select ok(
  (select verified_at is not null from core.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  'Confirming an AUIB address verifies it'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select ok(not membership.is_member(), 'An unverified account is not a member');
select is((select count(*) from core.profiles)::integer, 1,
  'An unverified account sees only its own profile');
select is((select count(*) from membership.verification_requests)::integer, 1,
  'Applicants see their own request');
select throws_ok(
  $$ select membership.decide_verification(
       (select id from membership.verification_requests limit 1), true) $$,
  '42501', null,
  'Applicants cannot approve themselves'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from membership.verification_requests)::integer, 0,
  'Members cannot read the verification queue');
select is((select count(*) from core.profiles where verified_at is null)::integer, 0,
  'Members do not see unverified profiles');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select lives_ok(
  $$ select membership.decide_verification(
       (select id from membership.verification_requests
        where user_id = '00000000-0000-0000-0000-0000000000b1'), true, 'Alumna, class of 2024') $$,
  'A members.verify holder approves the request'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select ok(membership.is_member(), 'An approved account is a member');

-- ── Pledges ─────────────────────────────────────────────────────────────────

select is(
  (select pending_pledges from membership.my_status()),
  array['member']::membership.pledge_type[],
  'The Code of Conduct acknowledgment is pending for a new member (decisions §19)'
);
select throws_ok(
  $$ select membership.accept_pledge('member', '0') $$,
  '22023', null,
  'An out-of-date pledge version is refused'
);
select lives_ok($$ select membership.accept_pledge('member', '1') $$, 'Accepting the current Member Pledge');
select ok(membership.has_current_pledges(), 'The pledge is current');

select pg_temp.logout();
update core.settings set value = '"2"' where key = 'pledges.member.version';
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select ok(not membership.has_current_pledges(), 'A new pledge version must be re-accepted');

-- ── Voting eligibility ──────────────────────────────────────────────────────

select pg_temp.logout();
insert into membership.activity_records (user_id, kind, occurred_at, note) values
  -- Student: two this academic year → voting member.
  ('00000000-0000-0000-0000-0000000000a1', 'check_in', now() - interval '1 day', 'A reading'),
  ('00000000-0000-0000-0000-0000000000a1', 'check_in', greatest(private.academic_year_start()::timestamptz + interval '1 day', now() - interval '2 days'), 'A general meeting'),
  -- Second: one this month and one 13 months ago → not (decisions §2:
  -- two in the 12 months before the record date).
  ('00000000-0000-0000-0000-0000000000a2', 'check_in', now() - interval '1 day', 'A reading'),
  ('00000000-0000-0000-0000-0000000000a2', 'check_in', now() - interval '13 months', 'A general meeting');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select ok(membership.is_voting_member(), 'Two events or meetings in the last 12 months make a voting member');
select is(membership.activity_count(), 2, 'The count covers the 12 months before the record date');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select ok(not membership.is_voting_member(), 'An event more than 12 months ago does not count');
select is(
  membership.is_voting_member('00000000-0000-0000-0000-0000000000a1'),
  null,
  'Members cannot look up someone else''s eligibility'
);

select * from finish();
rollback;
