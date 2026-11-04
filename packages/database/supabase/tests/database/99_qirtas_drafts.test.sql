-- The experience audit (migration 20261101001600): the Awards Coordinator
-- role, and the Society's signature kept by name on a memorandum.
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

select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-00000000d1a1', 'drafts-writer@auib.edu.iq', 'Draft Writer');
select pg_temp.make_user('00000000-0000-0000-0000-00000000d1a2', 'drafts-other@auib.edu.iq', 'Other Member');

select ok(
  (select relrowsecurity from pg_class where oid = 'journal.submission_drafts'::regclass),
  'Drafts have row level security'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a1');
select lives_ok(
  $$ insert into journal.submission_drafts (id, category, title, content)
     values ('00000000-0000-0000-0000-00000000d1b1', 'poetry', 'Half a poem',
       '{"body": "<p>The river</p>"}') $$,
  'A member saves a draft'
);
select lives_ok(
  $$ update journal.submission_drafts set title = 'A poem'
     where id = '00000000-0000-0000-0000-00000000d1b1' $$,
  'and keeps working on it'
);
select is(
  (select title from journal.submission_drafts where id = '00000000-0000-0000-0000-00000000d1b1'),
  'A poem',
  'The writer reads their draft'
);
select throws_ok(
  $$ insert into journal.submission_drafts (category, title) values ('six_words', 'Six') $$,
  '23514', null,
  'Six Words take no drafts (they come only from the Typewriter Tour)'
);
select throws_ok(
  $$ insert into journal.submission_drafts (user_id, category, title)
     values ('00000000-0000-0000-0000-00000000d1a2', 'poetry', 'Not mine') $$,
  '42501', null,
  'Nobody saves a draft in another member''s name'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a2');
select is(
  (select count(*)::int from journal.submission_drafts),
  0,
  'Another member reads no one else''s drafts'
);
update journal.submission_drafts set title = 'Taken'
where id = '00000000-0000-0000-0000-00000000d1b1';

select pg_temp.login_anon();
select throws_ok(
  $$ select count(*) from journal.submission_drafts $$,
  '42501', null,
  'Visitors read no drafts'
);

select pg_temp.logout();
select is(
  (select title from journal.submission_drafts where id = '00000000-0000-0000-0000-00000000d1b1'),
  'A poem',
  'Another member can''t change a draft'
);

select * from finish();
rollback;
