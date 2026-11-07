-- Forms: who may fill in and handle each form, drafts, anonymous and
-- routed concerns (F-20), Society-wide incident handling (F-19), and
-- checklists their subject can read and tick.
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
create function pg_temp.as_api()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end;
$$;
grant execute on function pg_temp.as_api() to public;

select plan(27);

-- Forms signed on the site (decisions.md): /forms/<number>, a typed
-- name for a signature, the signed copy keeping the signer, the time and the
-- form's version. a1 a member, a2 the President, a3 the Vice President, a4
-- the Faculty Advisor, a6 the General Secretary.
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'member-fm@auib.edu.iq', 'A Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'president-fm@auib.edu.iq', 'The President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'vp-fm@auib.edu.iq', 'The VP');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a4', 'advisor-fm@auib.edu.iq', 'The Advisor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a6', 'gs-fm@auib.edu.iq', 'The GS');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a2', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a3', 'vice_president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a4', 'faculty_advisor');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a6', 'general_secretary');
insert into membership.memberships (user_id) values ('00000000-0000-0000-0000-0000000000a1') on conflict do nothing;

create temp table ids (name text primary key, id uuid);
grant all on ids to public;

select is(
  (select array_agg(code order by sort) from governance.form_types where filled = 'site'),
  array['F-06', 'F-10', 'F-11', 'F-15', 'F-17', 'F-21', 'F-26', 'F-37', 'F-38', 'F-39', 'F-44', 'F-45'],
  'The forms signed on the site'
);
select is(
  (select filled from governance.form_types where key = 'f22'),
  'removed',
  'F-22 is removed and never reused'
);

-- ── Who may sign what ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ insert into ids select 'f10', governance.sign_form('f10', '{"title":"Hold the Annual Meeting in the library"}', 'A Member', esign_agreed => true) $$,
  'A member proposes a motion for a members’ meeting (F-10)'
);
select ok(
  (select signer_name = 'A Member' and signed_at is not null and form_version is not null
   from governance.form_submissions where id = (select id from ids where name = 'f10')),
  'The signed copy keeps the signer, the time and the form’s version'
);
select throws_ok(
  $$ select governance.sign_form('f11', '{"title":"A walk"}', 'A Member') $$,
  '23514', 'esign_agreement_required',
  'The signer agrees to sign electronically'
);
select ok(
  (select document_sha256 ~ '^[0-9a-f]{64}$' and esign_agreed
   from governance.form_submissions where id = (select id from ids where name = 'f10')),
  'and the signed copy keeps the fingerprint of what was signed'
);
select pg_temp.logout();
select is(
  (select count(*)::int from core.outbox where kind = 'forms.signed_copy'
   and payload ->> 'submission_id' = (select id::text from ids where name = 'f10')),
  1, 'The signer is emailed a copy'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ select governance.sign_form('f11', '{"title":"A walk"}', ' ', esign_agreed => true) $$,
  '23514', 'signature_required',
  'A form is signed by typing a name'
);
select throws_ok(
  $$ select governance.sign_form('f04', '{}', 'A Member') $$,
  'P0002', 'unknown_form',
  'A form kept elsewhere is not signed here'
);
select throws_ok(
  $$ select governance.sign_form('f10', '{}', 'A Member', null, null, true) $$,
  '42501', 'use_the_form_page',
  'Anonymous forms go through the form page''s check, not the browser'
);
select throws_ok(
  $$ select governance.sign_form('f11', '{}', 'A Member', null, null, false, 'president', true) $$,
  '22023', 'routing_only_for_concerns',
  'Routing is only for concerns'
);
select throws_ok(
  $$ insert into governance.form_submissions (form_key, submitted_by, data)
     values ('f10', auth.uid(), '{}') $$,
  '42501', null,
  'Nobody writes submissions directly'
);

-- ── Concerns (F-21): anonymity and routing ──
select pg_temp.as_api();
insert into ids select 'anon', governance.sign_form('f21', '{"what":"Something at an event"}', '', null, null, true);
select throws_ok(
  $$ select governance.sign_form('f11', '{}', 'A Member', null, null, true) $$,
  '22023', 'anonymous_not_allowed',
  'Only concerns may be anonymous'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
insert into ids select 'about_vp', governance.sign_form('f21', '{"what":"About the VP"}', 'A Member', null, null, false, 'vice_president', true);
select is((select count(*)::int from governance.form_submissions where form_key = 'f21'), 1,
  'An anonymous concern cannot be read back even by whoever sent it');
select pg_temp.logout();
select is((select array[submitted_by::text, signer_name] from governance.form_submissions where id = (select id from ids where name = 'anon')),
  array[null, null]::text[], 'and no account or signature is stored with it');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from governance.form_submissions where form_key = 'f21'), 1,
  'The Vice President receives concerns, but never one about the Vice President');
select throws_ok(
  format($$ select governance.handle_form(%L, 'acknowledged') $$, (select id from ids where name = 'about_vp')),
  '42501', 'not_allowed',
  'nor handles it'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from governance.form_submissions where form_key = 'f21'), 2,
  'The President receives both');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from governance.form_submissions where form_key = 'f21'), 2,
  'and so does the Faculty Advisor');

-- ── Anyone, signed in or not, may sign a form that needs no account ──
select pg_temp.login_anon();
select throws_ok(
  $$ select governance.sign_form('f11', '{"title":"x"}', 'A Visitor', esign_agreed => true) $$,
  '42501', null,
  'Signed out, the browser cannot sign directly'
);
select pg_temp.as_api();
select lives_ok(
  $$ select governance.sign_form('f11', '{"title":"A walk on the river","idea":"Read on the bank."}', 'A Visitor', null, 'visitor@example.com', esign_agreed => true, signer_ip => '203.0.113.5') $$,
  'A visitor pitches an event (F-11) and signs it, through the form page'
);
select is((select signer_ip from governance.form_submissions where form_key = 'f11'), '203.0.113.5',
  'and the signed copy keeps the IP address');
select throws_ok(
  $$ select governance.sign_form('f10', '{"title":"x"}', 'A Visitor', esign_agreed => true) $$,
  '42501', 'sign_in_required',
  'but a motion needs an account'
);

-- ── A parent's consent: a single-use link, sent through the teacher ──
select throws_ok(
  $$ select governance.sign_form('f39', '{}', 'A Parent', esign_agreed => true, link_token => 'nope') $$,
  '42501', 'link_not_valid',
  'A parent''s form needs its link'
);

-- ── Handling ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  format($$ select governance.handle_form(id, 'acknowledged', '{"received":"2026-11-09"}') from governance.form_submissions where form_key = 'f11' $$),
  'The President acknowledges the pitch'
);
select ok((select acknowledged_at is not null and office ->> 'received' = '2026-11-09'
  from governance.form_submissions where form_key = 'f11'),
  'with the time and the office-use boxes');

-- A trip consent (F-45) names a published trip.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ select governance.sign_form('f45', '{"agree":true}', 'A Member', esign_agreed => true) $$,
  '22023', 'not_a_trip',
  'A trip consent names a published trip off campus'
);

select * from finish();
rollback;
