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

select plan(27);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'member-rc@auib.edu.iq', 'Layla Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'president-rc@auib.edu.iq', 'The President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'eic-rc@auib.edu.iq', 'The Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a6', 'qalam-rc@auib.edu.iq', 'The Qalam Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a4', 'lead-rc@auib.edu.iq', 'Programme Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a5', 'gs-rc@auib.edu.iq', 'General Secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a2', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a3', 'eic');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a6', 'qalam_lead');
insert into programmes.qalam_students (id, year, first_name, last_name, school)
values ('00000000-0000-0000-0000-00000000c001', 2028, 'Sara', 'Ahmed', 'Baghdad High');
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
  'Shifts log no hours (decisions.md): staff hours are logged by hand'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is(membership.service_hours(), 3.00::numeric, 'The member sees 3 confirmed hours this year');
select is(membership.service_hours('00000000-0000-0000-0000-0000000000a2'), null::numeric,
  'but not someone else''s');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a5');
select is((select hours from membership.service_totals() where user_id = '00000000-0000-0000-0000-0000000000a1'),
  3.00::numeric, 'The General Secretary sees everyone''s totals');

-- Certificates only for finishing Qalam and for the Mutanabbi Prize (owner,
-- Nov 7, 2026), one language each; signers by kind.
select lives_ok(
  $$ insert into membership.certificates (id, user_id, kind, prize_category, citation_en, lang)
     values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'prize',
       'qirtas', 'For "Small Hours," a short story', 'en') $$,
  'The General Secretary prepares a Prize certificate'
);
select throws_ok(
  $$ insert into membership.certificates (user_id, kind, period_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'service', current_date) $$,
  '23514', null,
  'No certificates of service, Fellowship or volunteering'
);
select lives_ok(
  $$ insert into membership.certificates (id, kind, qalam_student_id, lang)
     values ('00000000-0000-0000-0000-00000000f002', 'qalam', '00000000-0000-0000-0000-00000000c001', 'ar') $$,
  'A Qalam certificate names a student on the roster, who has no account'
);
select throws_ok(
  $$ select membership.sign_certificate('00000000-0000-0000-0000-00000000f001') $$,
  '42501', 'not_allowed',
  'The General Secretary cannot sign'
);

select pg_temp.logout();
create temp table cert_code as
  select id, verification_code as code from membership.certificates
  where id in ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000f002');
grant select on cert_code to anon, authenticated;

select pg_temp.login_anon();
select is((select count(*)::int from membership.verify_certificate(
  (select code from cert_code where id = '00000000-0000-0000-0000-00000000f001'))),
  0, 'A draft certificate does not verify');

-- The Prize: the Editor-in-Chief and the President, in either order.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select is(membership.sign_certificate('00000000-0000-0000-0000-00000000f001'), 'signed',
  'The President signs');
select throws_ok(
  $$ select membership.sign_certificate('00000000-0000-0000-0000-00000000f001') $$,
  '42501', 'not_allowed',
  'and cannot sign in the Editor-in-Chief''s place'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a6');
select throws_ok(
  $$ select membership.sign_certificate('00000000-0000-0000-0000-00000000f001') $$,
  '42501', 'not_allowed',
  'The Qalam lead does not sign the Prize'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select is(membership.sign_certificate('00000000-0000-0000-0000-00000000f001'), 'issued',
  'The Editor-in-Chief''s signature issues it');
select pg_temp.logout();
select matches((select serial from membership.certificates where id = '00000000-0000-0000-0000-00000000f001'),
  '^CERT-\d{4}-001$', 'with the year''s first serial (decisions §6)');

select pg_temp.login_anon();
select is((select holder_en || ' · ' || status || ' · ' || prize_category from membership.verify_certificate(
  (select code from cert_code where id = '00000000-0000-0000-0000-00000000f001'))),
  'Layla Member · issued · qirtas', 'Anyone with the code sees what was awarded');

-- Qalam: the Qalam lead, then the Editor-in-Chief.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a6');
select is(membership.sign_certificate('00000000-0000-0000-0000-00000000f002'), 'signed',
  'The Qalam lead signs a Qalam certificate first');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select is(membership.sign_certificate('00000000-0000-0000-0000-00000000f002'), 'issued',
  'and the Editor-in-Chief issues it');
select pg_temp.login_anon();
select is((select holder_en || ' · ' || school || ' · ' || year from membership.verify_certificate(
  (select code from cert_code where id = '00000000-0000-0000-0000-00000000f002'))),
  'Sara A. · Baghdad High · 2028',
  'A Qalam student''s check shows the first name, last initial, school and year only');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ select membership.revoke_certificate('00000000-0000-0000-0000-00000000f001', 'Issued in error') $$,
  'The President can revoke it'
);
select pg_temp.login_anon();
select is((select status from membership.verify_certificate(
  (select code from cert_code where id = '00000000-0000-0000-0000-00000000f001'))),
  'revoked', 'and verification then says so');

-- Service letters (F-05): written by the Director of Membership's team,
-- each checked by its code.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a5');
select lives_ok(
  $$ insert into membership.service_letters (id, user_id, role_en, period_from, period_to)
     values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000a1',
       'Section editor, Qirtas', '2026-09-01', '2027-05-31') $$,
  'The General Secretary writes a service letter'
);
select pg_temp.logout();
create temp table letter_code as
  select verification_code as code from membership.service_letters where id = '00000000-0000-0000-0000-00000000d001';
grant select on letter_code to anon, authenticated;
select pg_temp.login_anon();
select is((select holder_en || ' · ' || role_en from membership.verify_service_letter(
  (select code from letter_code))),
  'Layla Member · Section editor, Qirtas', 'Anyone with its code can check the letter');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ insert into membership.service_letters (user_id, role_en, period_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'Everything', current_date) $$,
  '42501', null,
  'A member cannot write their own letter'
);

select * from finish();
rollback;
