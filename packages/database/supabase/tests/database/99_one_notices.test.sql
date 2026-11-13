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

select pg_temp.make_user('00000000-0000-0000-0000-0000000ac001', 'pres-notice@auib.edu.iq', 'President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ac002', 'member-notice@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000ac001', 'president');
insert into core.telegram_accounts (user_id, telegram_id) values
  ('00000000-0000-0000-0000-0000000ac001', 910001);
insert into core.staff_alerts (team, text_en, text_ar, dedupe_key) values
  ('council', 'Something to look at.', 'شيء يستحق النظر.', 'test:1');

select throws_ok(
  $$ insert into core.staff_alerts (team, text_en, text_ar) values ('finance', 'x', 'x') $$,
  '23514', null,
  'Alerts go only to the six teams'
);

-- A member without Telegram: the email switches, no Hudhud.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ac002');
select is(
  (select linked from core.my_notices()), false,
  'Without Telegram the grid says so'
);
select core.set_my_notice('paper', 'email', false);
select is(
  (select paper_email from core.my_notices()), false,
  'A member turns the Sunday Paper''s email off'
);
select throws_ok(
  $$ select core.set_my_notice('paper', 'fax', true) $$,
  '22023', null,
  'Only email and Hudhud are channels'
);
select is(
  (select count(*) from core.staff_alerts), 0::bigint,
  'A member without a role reads no staff alerts'
);
select throws_ok(
  $$ select count(*) from core.paper_deliveries $$,
  '42501', null,
  'Nobody but the server reads the Paper''s deliveries'
);

-- The President, linked: the Hudhud switches.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ac001');
select is(
  (select (linked, reminders_tg) from core.my_notices()), (true, true),
  'Linked, reminders by Hudhud start on'
);
select core.set_my_notice('reminders', 'telegram', false);
select core.set_my_notice('word', 'telegram', false);
select is(
  (select (reminders_tg, word_tg) from core.my_notices()), (false, false),
  'A linked member turns Hudhud''s reminders and word off'
);
select is(
  (select count(*) from core.staff_alerts), 1::bigint,
  'A role holder reads the staff alerts'
);

select pg_temp.logout();
select throws_ok(
  $$ insert into core.telegram_posts (chat_id, kind, ref) values (1, 'nonsense', 'x') $$,
  '23514', null,
  'Post kinds stay a closed list'
);

select * from finish();
rollback;
