-- The ninth site prompt (Nov 14, 2026): one sign-up, the official name
-- only, what is signed, the daily update, motions, the enrollment check.
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

-- ── One sign-up: the class follows the address ──
create function pg_temp.sign_up(uid uuid, email text, meta jsonb)
returns void language sql as $$
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
  values (uid, email, null, meta || '{"agreed_at":"now","first_name_en":"Sam","father_name_en":"Ali","grandfather_name_en":"Omar","last_name_en":"Hadi","first_name_ar":"سام","father_name_ar":"علي","grandfather_name_ar":"عمر","last_name_ar":"هادي"}'::jsonb,
    'authenticated', 'authenticated');
  update auth.users set email_confirmed_at = now() where id = uid;
$$;
grant execute on all functions in schema pg_temp to public;

select pg_temp.sign_up('00000000-0000-0000-0000-000000091001', 'student.n9@auib.edu.iq', '{"class":"student"}');
select pg_temp.sign_up('00000000-0000-0000-0000-000000091002', 'staff.n9@auib.edu.iq', '{"class":"staff"}');
select pg_temp.sign_up('00000000-0000-0000-0000-000000091003', 'visitor.n9@example.org', '{}');
select pg_temp.sign_up('00000000-0000-0000-0000-000000091004', 'alumna.n9@example.org', '{"studied_at_auib":"true"}');

select is((select tier::text from membership.memberships where user_id = '00000000-0000-0000-0000-000000091001'),
  'member', 'A student''s AUIB address is a Member');
select is((select tier::text from membership.memberships where user_id = '00000000-0000-0000-0000-000000091002'),
  'associate', 'Faculty, staff or alumni at an AUIB address are Associates');
select ok(exists (select 1 from membership.guests where user_id = '00000000-0000-0000-0000-000000091003')
  and not exists (select 1 from membership.memberships where user_id = '00000000-0000-0000-0000-000000091003'),
  'Any other address is a Guest');
select is((select count(*)::int from membership.associate_requests where email = 'alumna.n9@example.org'), 1,
  '"I studied at AUIB" sends an Associate request');
select ok((select accepted_versions ?& array['terms', 'privacy', 'code_of_conduct'] and agreed_at is not null
    and esign_agreed_at is not null
  from core.profiles where id = '00000000-0000-0000-0000-000000091001'),
  'The sign-up line is logged on the account: the versions, the time and the consent to sign electronically');
select is((select count(*)::int from governance.form_submissions
  where submitted_by = '00000000-0000-0000-0000-000000091001'), 0,
  'It is no signed record: nothing in Documents');
select is((select count(*)::int from core.outbox where kind = 'forms.signed_copy'
  and payload ->> 'user_id' = '00000000-0000-0000-0000-000000091001'), 0, 'and no email');
select isnt((select legal_name_locked_at from core.profiles where id = '00000000-0000-0000-0000-000000091001'), null,
  'The official name is locked at once');

-- ── Names for Membership ──
select pg_temp.make_user('00000000-0000-0000-0000-000000091005', 'partial.n9@auib.edu.iq', 'Partial');
select pg_temp.make_user('00000000-0000-0000-0000-000000091009', 'director.n9@auib.edu.iq', 'Director');
select pg_temp.grant_role('00000000-0000-0000-0000-000000091009', 'membership_director');
select pg_temp.login_as('00000000-0000-0000-0000-000000091009', '{"aal":"aal2"}');
select ok(exists (select 1 from membership.incomplete_names() where user_id = '00000000-0000-0000-0000-000000091005'),
  'Membership sees the accounts whose official name is incomplete');
select ok(not exists (select 1 from membership.incomplete_names() where user_id = '00000000-0000-0000-0000-000000091001'),
  'and not the complete ones');

-- ── The enrollment check: only mismatches, nothing kept ──
select results_eq(
  $$ select user_id, issue from membership.enrollment_mismatches(array['STAFF.n9@auib.edu.iq', 'someone@auib.edu.iq'])
     where user_id in ('00000000-0000-0000-0000-000000091001', '00000000-0000-0000-0000-000000091002') order by issue $$,
  $$ values ('00000000-0000-0000-0000-000000091002'::uuid, 'enrolled_associate'),
            ('00000000-0000-0000-0000-000000091001'::uuid, 'not_enrolled') $$,
  'The check shows a Member not on Student Life''s list and an Associate who is, matched by AUIB email');
select throws_ok($$ select * from membership.enrollment_mismatches('{}') $$, '22023', 'empty_list',
  'An empty list checks nothing');
select pg_temp.login_as('00000000-0000-0000-0000-000000091001');
select throws_ok($$ select * from membership.enrollment_mismatches(array['a@auib.edu.iq']) $$, '42501', null,
  'Only the Director of Membership runs it');
select throws_ok($$ select * from membership.incomplete_names() $$, '42501', null,
  'and sees the incomplete names');

-- ── A motion: a submission, supported with one click ──
create temp table motion on commit drop as
  select governance.sign_form('members-meeting-motion',
    '{"title":"Meet in the library","believes":"Books belong to everyone.","resolves":"The Annual Meeting is held in the library."}',
    '') as id;
grant select on motion to public;
select matches((select reference from governance.form_submissions where id = (select id from motion)),
  '^SUB-[0-9]{4}-[0-9]{4}$', 'A motion takes a SUB number');
select pg_temp.logout();
insert into membership.memberships (user_id) values ('00000000-0000-0000-0000-000000091005') on conflict do nothing;
select pg_temp.login_as('00000000-0000-0000-0000-000000091005');
select is(governance.support_motion((select id from motion), true), 1::bigint, 'A member supports a motion with one click');
select is(governance.support_motion((select id from motion), true), 1::bigint, 'once');
select ok((select mine and supporters = 1 from governance.open_motions() where id = (select id from motion)),
  'and the open motions show it');
select is(governance.support_motion((select id from motion), false), 0::bigint, 'Support can be taken back');
select pg_temp.login_as('00000000-0000-0000-0000-000000091003');
select throws_ok($$ select * from governance.open_motions() $$, '42501', null, 'Guests do not support motions');

-- ── The daily update ──
select pg_temp.logout();
insert into core.daily_updates (user_id, kind, ref, detail)
values ('00000000-0000-0000-0000-000000091001', 'forms.updated', 'x', '{"line":"Your motion was acknowledged."}');
select ok(private.enqueue_daily_updates() >= 1, 'Once a day, one email per person with updates');
select is((select count(*)::int from core.outbox where kind = 'account.daily_update'
  and payload ->> 'user_id' = '00000000-0000-0000-0000-000000091001'), 1, 'one for the person with an update');
select is((select count(*)::int from core.daily_updates where user_id = '00000000-0000-0000-0000-000000091001' and sent_at is null), 0,
  'and its updates are marked sent');

-- ── A credited name, set by Media ──
select pg_temp.make_user('00000000-0000-0000-0000-000000091006', 'media.n9@auib.edu.iq', 'Media');
select pg_temp.grant_role('00000000-0000-0000-0000-000000091006', 'media_director');
select pg_temp.login_as('00000000-0000-0000-0000-000000091006', '{"aal":"aal2"}');
select lives_ok($$ select programmes.set_credited_name('00000000-0000-0000-0000-000000091001', 'Sam Hadi', 'سام هادي') $$,
  'Media sets a credited name, used only in credits, captions and playbills');

-- ── Tenth prompt: a received email; incidents; no push ──
select pg_temp.logout();
select is((select count(*)::int from core.outbox where kind = 'forms.received'
  and payload ->> 'submission_id' = (select id::text from motion)), 1,
  'A submission sends one "received" email at once');
select is(to_regclass('core.push_subscriptions'), null, 'There is no browser push: notices are email and Hudhud');
select ok((select keeps from private.retention_schedule() where runs = 'private.purge_incident_records') like '2 years after the case closes%',
  'Incident records are kept two years after the case closes');

select * from finish();
rollback;
