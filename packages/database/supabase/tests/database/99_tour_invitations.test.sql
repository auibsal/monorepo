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
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'adopted', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

-- The spring 2026 Tour's import and the invitation Broadcast (owner, Nov 7, 2026).

select plan(12);

select pg_temp.make_user('00000000-0000-0000-0000-0000000071a1', 'lead@auib.edu.iq', 'Tour Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071a2', 'member@auib.edu.iq', 'Plain Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071a3', 'writer.1234@auib.edu.iq', 'Early Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071a4', 'president@auib.edu.iq', 'The President');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000071a1', 'tour_lead');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000071a4', 'president');

delete from core.outbox where kind like 'membership.%';

select pg_temp.login_as('00000000-0000-0000-0000-0000000071a2');
select throws_ok(
  $$ select programmes.import_tour('[]'::jsonb, '[]'::jsonb) $$,
  '42501', null, 'Only whoever runs the Tour imports it'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000071a1');
select is(
  programmes.import_tour(
    '[{"page_ref":"TT26-T-001","text":"Kept for the writer who has an account","language":"en","email":"Writer.1234@auib.edu.iq","status":"Eligible, needs consent","tier":"A","tour":"Typewriter Tour, Spring 2026"},
      {"page_ref":"TT26-T-002","text":"Not for the wall","language":"mixed","email":"","status":"Not for publication"}]'::jsonb,
    '[{"email":"new.9999@auib.edu.iq","first_name":"New","station":"College of Law","their_words":"A small story","quote_words":"yes","pages":1},
      {"email":"writer.1234@auib.edu.iq","first_name":"Early","station":"Food Court","their_words":"","quote_words":"no","pages":2}]'::jsonb
  ) ->> 'attached',
  '1', 'A page whose writer has an account goes to them at once'
);
select pg_temp.logout();
select is((select visibility from programmes.six_words where page_ref = 'TT26-T-001'), 'private',
  'and stays private until the writer chooses');
select is((select publishable from programmes.six_words where page_ref = 'TT26-T-002'), false,
  'A page marked not for publication stays off every public view');
select is((select language from programmes.six_words where page_ref = 'TT26-T-002'), 'other',
  'A language other than English or Arabic is kept as other');
select is((select quote_words::text || pages from membership.invitations where email = 'new.9999@auib.edu.iq'), 'true1',
  'The invitation keeps whether the words may be quoted');

select pg_temp.login_as('00000000-0000-0000-0000-0000000071a1');
select is((programmes.import_tour('[{"page_ref":"TT26-T-001","text":"Kept, corrected","language":"en","email":"writer.1234@auib.edu.iq"}]'::jsonb, '[]'::jsonb) ->> 'pages'), '1',
  'Loading again updates what was loaded');
select is((membership.invitations_waiting() ->> 'waiting'), '1',
  'One invitation waits: the writer with an account is not invited');
select throws_ok($$ select membership.send_invitations() $$, '42501', null,
  'Only the President sends the invitations');

select pg_temp.login_as('00000000-0000-0000-0000-0000000071a4');
select is(membership.send_invitations(), 1, 'The President sends the one waiting');
select pg_temp.logout();
select is((select count(*)::integer from core.outbox where kind = 'membership.invitations'), 1,
  'as one Broadcast job, not an email an address');
select pg_temp.login_as('00000000-0000-0000-0000-0000000071a4');
select is(membership.send_invitations(), 0, 'Nothing is sent twice');

select * from finish();
rollback;
