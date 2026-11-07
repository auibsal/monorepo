-- Recognition: staff service records confirmed by someone else, shifts
-- marked as worked, certificates issued only with both signatures, and
-- public verification by code.
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

select plan(20);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'member-rc@auib.edu.iq', 'Layla Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'president-rc@auib.edu.iq', 'The President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'advisor-rc@auib.edu.iq', 'The Advisor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a4', 'lead-rc@auib.edu.iq', 'Programme Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a5', 'gs-rc@auib.edu.iq', 'General Secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a2', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a3', 'faculty_advisor');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a4', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'company'));
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a5', 'general_secretary');

-- Members log hours (F-16) as pending, and cannot confirm them.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ insert into membership.service_records (id, programme_id, occurred_on, activity, what, hours)
     select '00000000-0000-0000-0000-00000000e001', id, current_date - 3, 'Side Quest', 'Set up chairs', 3
     from core.programmes where slug = 'company' $$,
  'A member logs hours as pending'
);
select throws_ok(
  $$ insert into membership.service_records (occurred_on, activity, hours, status)
     values (current_date, 'Self-confirmed', 5, 'confirmed') $$,
  '42501', null,
  'and cannot log them as confirmed'
);
select throws_ok(
  $$ select membership.confirm_service('00000000-0000-0000-0000-00000000e001', true) $$,
  '42501', 'not_allowed',
  'nor confirm their own hours'
);

-- The program lead confirms hours for their own program.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4');
select lives_ok(
  $$ select membership.confirm_service('00000000-0000-0000-0000-00000000e001', true) $$,
  'The program lead confirms hours logged for their program'
);
select ok(
  not exists (select 1 from pg_proc where proname = 'record_shift_service'),
  'Shifts log no hours (owner, Nov 7, 2026): staff hours are logged by hand'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is(membership.service_hours(), 3.00::numeric, 'The member sees 3 confirmed hours this year');
select is(membership.service_hours('00000000-0000-0000-0000-0000000000a2'), null::numeric,
  'but not someone else''s');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a5');
select is((select hours from membership.service_totals() where user_id = '00000000-0000-0000-0000-0000000000a1'),
  3.00::numeric, 'The General Secretary sees everyone''s totals');

-- Certificates only for finishing Qalam and for the Mutanabbi Prize (owner,
-- Nov 7, 2026).
select lives_ok(
  $$ insert into membership.certificates (id, user_id, kind, citation_en)
     values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'prize',
       'For the best work in Qirtas') $$,
  'The General Secretary prepares a Prize certificate'
);
select throws_ok(
  $$ insert into membership.certificates (user_id, kind, role_en, period_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'service', 'Door Coordinator', current_date) $$,
  '23514', null,
  'No certificates of service, Fellowship or volunteering'
);
select lives_ok(
  $$ insert into membership.certificates (kind, recipient_name)
     values ('qalam', 'Sara A.') $$,
  'A Qalam certificate names a student, who has no account'
);
select throws_ok(
  $$ select membership.sign_certificate('00000000-0000-0000-0000-00000000f001') $$,
  '42501', 'not_allowed',
  'The General Secretary cannot sign'
);

select pg_temp.logout();
create temp table cert_code as
  select verification_code as code from membership.certificates where id = '00000000-0000-0000-0000-00000000f001';
grant select on cert_code to anon, authenticated;

select pg_temp.login_anon();
select is((select count(*)::int from membership.verify_certificate(
  (select code from cert_code))),
  0, 'A draft certificate does not verify');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select is(membership.sign_certificate('00000000-0000-0000-0000-00000000f001'), 'signed',
  'The President signs');
select throws_ok(
  $$ select membership.sign_certificate('00000000-0000-0000-0000-00000000f001') $$,
  '42501', 'not_allowed',
  'and cannot sign twice in place of the Faculty Advisor'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select is(membership.sign_certificate('00000000-0000-0000-0000-00000000f001'), 'issued',
  'The Faculty Advisor''s countersignature issues it');
select pg_temp.logout();
select matches((select serial from membership.certificates where id = '00000000-0000-0000-0000-00000000f001'),
  '^SAL-\d{4}-001$', 'with the year''s first serial');

select pg_temp.login_anon();
select is((select holder_en || ' · ' || status from membership.verify_certificate(
  (select code from cert_code))),
  'Layla Member · issued', 'Anyone with the code can verify it');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ select membership.revoke_certificate('00000000-0000-0000-0000-00000000f001', 'Issued in error') $$,
  'The President can revoke it'
);
select pg_temp.login_anon();
select is((select status from membership.verify_certificate(
  (select code from cert_code))),
  'revoked', 'and verification then says so');

select * from finish();
rollback;
