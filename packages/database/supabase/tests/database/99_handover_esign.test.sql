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

-- The eighth prompt (decisions.md, Documents and forms): the handover is
-- signed on the site and countersigned; consent to sign electronically is
-- asked once.

select plan(20);

select pg_temp.make_user('00000000-0000-0000-0000-0000000ec001', 'outgoing@auib.edu.iq', 'Out Going');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ec002', 'incoming@auib.edu.iq', 'In Coming');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ec003', 'bystander@auib.edu.iq', 'By Stander');
insert into access.role_assignments (id, user_id, role, scope_type, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000ecaa1', '00000000-0000-0000-0000-0000000ec001', 'web_lead', 'global',
    now() - interval '200 days', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000ecaa2', '00000000-0000-0000-0000-0000000ec002', 'web_lead', 'global',
    now() - interval '1 day', null);

-- The outgoing holder sees the handover to sign.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ec001');
select is((select assignment_id from access.my_handovers_due()),
  '00000000-0000-0000-0000-0000000ecaa1'::uuid, 'Leaving a role asks for its handover');
select ok((select asked_at is null from core.my_esign()), 'An older account has not been asked to sign electronically');
select throws_ok(
  $$ select governance.sign_form('handover', '{"in_progress": "x", "where": "y", "access": "z"}'::jsonb, '',
       '00000000-0000-0000-0000-0000000ecaa1') $$,
  '23514', 'esign_agreement_required', 'Without the consent, a signing needs it on the page'
);
select isnt(core.answer_esign(true), null, 'The person agrees to sign electronically, once');
select lives_ok(
  $$ select governance.sign_form('handover', '{"in_progress": "x", "where": "y", "access": "z"}'::jsonb, '',
       '00000000-0000-0000-0000-0000000ecaa1') $$,
  'and then signs the handover without being asked again'
);
select throws_ok(
  $$ select governance.sign_form('handover', '{"in_progress": "x", "where": "y", "access": "z"}'::jsonb, '',
       '00000000-0000-0000-0000-0000000ecaa1') $$,
  '23505', 'handover_signed', 'One handover per role held'
);
select throws_ok(
  $$ select governance.sign_form('handover', '{}'::jsonb, '', '00000000-0000-0000-0000-0000000ecaa2') $$,
  '42501', 'not_your_role', 'Only for one''s own role'
);
select is((select count(*)::int from access.my_handovers_due()), 0, 'Signed, it no longer waits');
select pg_temp.logout();

select matches((select reference from governance.form_submissions
  where form_key = 'handover' and subject_id = '00000000-0000-0000-0000-0000000ecaa1'),
  '^AGR-[0-9]{4}-[0-9]{4}$', 'The handover gets its AGR number');
select is((select esign_agreed from governance.form_submissions
  where form_key = 'handover' and subject_id = '00000000-0000-0000-0000-0000000ecaa1'), true,
  'and records the account''s consent');

-- Someone else cannot countersign; the incoming holder can.
create temp table handover_ids as
  select id, private.register_name('00000000-0000-0000-0000-0000000ec001') as outgoing,
    private.register_name('00000000-0000-0000-0000-0000000ec002') as incoming
  from governance.form_submissions
  where form_key = 'handover' and subject_id = '00000000-0000-0000-0000-0000000ecaa1';
grant select on handover_ids to authenticated;
select pg_temp.login_as('00000000-0000-0000-0000-0000000ec003');
select is((select count(*)::int from governance.handovers_to_countersign()), 0,
  'A bystander has nothing to countersign');
select throws_ok(
  $$ select governance.second_sign_form((select id from handover_ids), 'By Stander') $$,
  '42501', null, 'and cannot countersign'
);
select pg_temp.logout();

select pg_temp.login_as('00000000-0000-0000-0000-0000000ec002');
select is((select outgoing from governance.handovers_to_countersign()),
  (select outgoing from handover_ids), 'The incoming holder reads the handover');
select lives_ok(
  $$ select governance.second_sign_form((select id from governance.handovers_to_countersign() limit 1), 'Typed Name') $$,
  'and countersigns it'
);
select is((select second_signer_name from governance.form_submissions
  where form_key = 'handover' and subject_id = '00000000-0000-0000-0000-0000000ecaa1'),
  (select incoming from handover_ids), 'in the name the register holds, never a typed one');
select is((select count(*)::int from governance.form_submissions where form_key = 'handover'), 1,
  'The countersigner keeps the signed copy too');
select pg_temp.logout();

-- Withdrawing the consent; and sign-up's own line.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ec001');
select is(core.answer_esign(false), null, 'The consent can be withdrawn in Settings');
select ok((select asked_at is not null from core.my_esign()), 'and the sign-in question is not asked again');
select pg_temp.logout();

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, aud, role)
values ('00000000-0000-0000-0000-0000000ec004', 'newcomer@auib.edu.iq',
  '{"first_name_en": "New", "last_name_en": "Comer", "agreed_at": "now"}', now(),
  'authenticated', 'authenticated');
select ok((select esign_agreed_at is not null and esign_asked_at is not null from core.profiles
  where id = '00000000-0000-0000-0000-0000000ec004'), 'Sign-up''s own line records the consent');
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, aud, role)
values ('00000000-0000-0000-0000-0000000ec005', 'declined@auib.edu.iq',
  '{"first_name_en": "No", "last_name_en": "Line"}', now(),
  'authenticated', 'authenticated');
select ok((select esign_agreed_at is null and esign_asked_at is null from core.profiles
  where id = '00000000-0000-0000-0000-0000000ec005'), 'and an account made without it is asked on Today, not given');

select * from finish();
rollback;
