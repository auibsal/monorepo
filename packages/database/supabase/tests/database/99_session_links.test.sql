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

select plan(7);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e5001', 'host.e5@auib.edu.iq', 'Host');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e5002', 'member.e5@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e5001', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'listening-room'));

insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, status, members_only, entry)
values
  ('00000000-0000-0000-0000-0000000e5101', 'lr-e5-public',
   (select id from core.programmes where slug = 'listening-room'),
   'An album, played', 'ألبوم', now() - interval '7 days', 'published', false, 'open'),
  ('00000000-0000-0000-0000-0000000e5102', 'lr-e5-members',
   (select id from core.programmes where slug = 'listening-room'),
   'For members', 'للأعضاء', now() - interval '14 days', 'published', true, 'open'),
  ('00000000-0000-0000-0000-0000000e5103', 'salon-e5',
   (select id from core.programmes where slug = 'salon'),
   'A salon', 'صالون', now() - interval '7 days', 'published', false, 'open');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e5001');
select lives_ok(
  $$ insert into events.session_links (event_id, label_en, url) values
     ('00000000-0000-0000-0000-0000000e5101', 'The album', 'https://example.org/album'),
     ('00000000-0000-0000-0000-0000000e5102', 'Members only', 'https://example.org/members') $$,
  'the host adds links to their program''s sessions'
);
select throws_ok(
  $$ insert into events.session_links (event_id, label_en, url)
     values ('00000000-0000-0000-0000-0000000e5103', 'Not mine', 'https://example.org/x') $$,
  '42501', null,
  'but not to another program''s'
);
select throws_ok(
  $$ insert into events.session_links (event_id, label_en, url)
     values ('00000000-0000-0000-0000-0000000e5101', 'Plain', 'http://example.org/x') $$,
  '23514', null,
  'links are https only'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000e5002');
select throws_ok(
  $$ insert into events.session_links (event_id, label_en, url)
     values ('00000000-0000-0000-0000-0000000e5101', 'Me too', 'https://example.org/y') $$,
  '42501', null,
  'a member does not add links'
);
delete from events.session_links;

select pg_temp.login_anon();
select is((select count(*)::int from events.session_links), 1,
  'a visitor reads a public session''s links, not a members-only one''s, and a member cannot remove them');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e5001');
delete from events.session_links where label_en = 'The album';
select pg_temp.login_anon();
select is((select count(*)::int from events.session_links), 0, 'the host removes a link');
select pg_temp.logout();
select ok(
  (select count(*) > 0 from core.activity_log where table_schema = 'events' and table_name = 'session_links'),
  'links are written to the activity log'
);

select * from finish();
rollback;
