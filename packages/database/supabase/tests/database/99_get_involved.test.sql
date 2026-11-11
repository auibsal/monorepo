-- Get involved: openings with questions, and applications (decisions.md, Get involved and roles).
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

select plan(18);

select pg_temp.make_user('00000000-0000-0000-0000-0000000070a1', 'volunteer@auib.edu.iq', 'Volunteer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000070a2', 'stage.lead@auib.edu.iq', 'Stage Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000070a3', 'outsider@example.com', 'Outsider');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000070a2', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'company'));

-- Openings
select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select throws_ok(
  $$ insert into programmes.openings (programme_id, role, title_en, title_ar)
     values ((select id from core.programmes where slug = 'company'), 'stage_manager', 'Stage Manager', 'مدير الخشبة') $$,
  '42501', null, 'Members do not post openings'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a2');
select lives_ok(
  $$ insert into programmes.openings (id, programme_id, role, title_en, title_ar, questions)
     values ('0be00000-0000-0000-0000-0000000070b1', (select id from core.programmes where slug = 'company'),
       'stage_manager', 'Stage Manager', 'مدير الخشبة',
       '[{"key": "why", "en": "Why this role?", "ar": "لماذا هذا الدور؟", "required": true}]') $$,
  'A program''s managers post openings with their questions'
);
select throws_ok(
  $$ insert into programmes.openings (programme_id, role, title_en, title_ar)
     values ((select id from core.programmes where slug = 'typewriter-tour'), 'programme_lead', 'Salon Host', 'مضيف الصالون') $$,
  '42501', null, 'but only for their own program'
);
insert into programmes.openings (id, programme_id, role, title_en, title_ar, is_open)
values ('0be00000-0000-0000-0000-0000000070b2', (select id from core.programmes where slug = 'company'),
  'stage_manager', 'Closed role', 'دور مغلق', false);

select pg_temp.logout();
select throws_ok(
  $$ insert into programmes.openings (role, owner, title_en, title_ar)
     values ('media_director', 'council', 'Director of Media', 'مدير الإعلام') $$,
  'P0001', 'eb_approval_first', 'A director seat opens only once the Executive Board approves it'
);

select pg_temp.login_anon();
select ok(
  exists (select 1 from programmes.open_places() where id = '0be00000-0000-0000-0000-0000000070b1'),
  'Visitors read the open roles on Get involved'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select is((select count(*)::integer from programmes.openings where programme_id = (select id from core.programmes where slug = 'company')), 1, 'Members see open openings only');

-- Applications
select throws_ok(
  $$ insert into programmes.opening_replies (opening_id) values ('0be00000-0000-0000-0000-0000000070b1') $$,
  '42501', null, 'Applications go through the function, not the table'
);
select is(
  programmes.save_application('0be00000-0000-0000-0000-0000000070b1', '{}', 'Evenings', 'en', '{}', null, null, false),
  'draft', 'A member saves a draft'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a2');
select is((select count(*)::integer from programmes.opening_replies), 0, 'A draft stays the applicant''s');

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select throws_ok(
  $$ select programmes.save_application('0be00000-0000-0000-0000-0000000070b1', '{}', null, 'en', '{}', null, null, true) $$,
  '22023', 'answer_required', 'A required question must be answered to send'
);
select is(
  programmes.save_application('0be00000-0000-0000-0000-0000000070b1', '{"why": "I keep lists."}',
    'Evenings', 'en', '{}', 'A seat near the door', null, true),
  'new', 'and then it is sent'
);
select pg_temp.logout();
select ok(
  exists (select 1 from core.outbox o where o.kind = 'get_involved.received'),
  'The applicant gets a receipt by email'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select throws_ok(
  $$ select programmes.save_application('0be00000-0000-0000-0000-0000000070b1', '{"why": "Again"}', null, 'en', '{}', null, null, true) $$,
  'P0001', 'already_applied', 'One application per opening'
);
select throws_ok(
  $$ select programmes.save_application('0be00000-0000-0000-0000-0000000070b2', '{}', null, 'en', '{}', null, null, false) $$,
  'P0001', 'opening_closed', 'A closed opening takes none'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a3', '{"aal":"aal1"}');
select is((select count(*)::integer from programmes.openings), 0, 'Accounts that are not members see no openings');

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a2');
select is((select answers ->> 'why' from programmes.opening_replies), 'I keep lists.', 'The program''s managers read the application');

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select ok(programmes.withdraw_application('0be00000-0000-0000-0000-0000000070b1'), 'A member withdraws');
select is((select status from programmes.opening_replies), 'withdrawn', 'and the application is kept as withdrawn');

select * from finish();
rollback;
