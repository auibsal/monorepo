-- The design review, PR 4e (Nov 4, 2026): Open Pages prompt cards (A35).
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

select plan(8);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e4001', 'host.e4@auib.edu.iq', 'Host');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e4002', 'member.e4@auib.edu.iq', 'Member');
insert into events.events (id, slug, title_en, title_ar, starts_at, status, members_only, entry) values
  ('00000000-0000-0000-0000-0000000e4101', 'open-pages-e4', 'Open Pages', 'صفحات مفتوحة', now() + interval '14 days', 'published', false, 'open'),
  ('00000000-0000-0000-0000-0000000e4102', 'salon-e4', 'The Salon', 'الصالون', now() + interval '21 days', 'published', false, 'open');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e4001', 'programme_lead', 'event',
  '00000000-0000-0000-0000-0000000e4101');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e4001');
select lives_ok(
  $$ insert into programmes.prompts (event_id, text_en, text_ar)
     values ('00000000-0000-0000-0000-0000000e4101', 'A door you never opened', 'باب لم تفتحه') $$,
  'the event lead writes a prompt for their event'
);
select throws_ok(
  $$ insert into programmes.prompts (event_id, text_en)
     values ('00000000-0000-0000-0000-0000000e4102', 'Not mine') $$,
  '42501', null,
  'but not for another event'
);
insert into programmes.prompts (event_id, text_en, is_published)
  values ('00000000-0000-0000-0000-0000000e4101', 'A letter to a city', true);
select is((select count(*)::int from programmes.prompts), 2, 'the host sees drafts and published prompts');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e4002');
select is((select count(*)::int from programmes.prompts), 1, 'a member sees published prompts only');
select throws_ok(
  $$ insert into programmes.prompts (event_id, text_en)
     values ('00000000-0000-0000-0000-0000000e4101', 'Me too') $$,
  '42501', null,
  'a member does not write prompts'
);
update programmes.prompts set is_published = false;
select pg_temp.login_anon();
select is((select count(*)::int from programmes.prompts), 1, 'a visitor sees published prompts, and a member cannot hide them');
select pg_temp.logout();
select ok(
  (select count(*) > 0 from core.outbox where kind = 'revalidate' and payload->'tags' ? 'programmes'),
  'a prompt refreshes the cached event page'
);
select ok(
  (select count(*) > 0 from core.activity_log where table_schema = 'programmes' and table_name = 'prompts'),
  'prompts are written to the activity log'
);

select * from finish();
rollback;
