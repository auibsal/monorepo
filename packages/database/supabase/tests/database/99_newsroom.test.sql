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

-- decisions.md, Qirtas: the assignment desk, credits never typed, reading
-- copies.
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ad002', 'writer@auib.edu.iq', 'Rana Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ad003', 'cowriter@auib.edu.iq', 'Sami Cowriter');
insert into journal.contributors (id, slug, user_id, name_en, name_ar) values
  ('c0000000-0000-0000-0000-0000000ad003', 'sami-cowriter', '00000000-0000-0000-0000-0000000ad003', 'Sami', 'سامي');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
insert into journal.story_assignments (id, desk, slug, angle, kind, due_on, assignee_id, created_by)
values ('a0000000-0000-0000-0000-0000000ad0a1', 'news', 'library-hours', 'The library''s new hours',
  'writing', current_date + 7, '00000000-0000-0000-0000-0000000ad002', '00000000-0000-0000-0000-0000000000f1');
select is((select stage from journal.desk_board('news') where id = 'a0000000-0000-0000-0000-0000000ad0a1'),
  'assigned', 'An editor''s assignment is on the section''s board, Assigned');

select pg_temp.login_as('00000000-0000-0000-0000-0000000ad002');
select ok(exists (select 1 from core.my_todos() where kind = 'assignment'),
  'The assignee accepts it from Today');
update journal.story_assignments set status = 'accepted', accepted_at = now()
where id = 'a0000000-0000-0000-0000-0000000ad0a1';
select ok(not exists (select 1 from core.my_todos() where kind = 'assignment'),
  'and the to-do clears once accepted');
select isnt(journal.start_assignment('a0000000-0000-0000-0000-0000000ad0a1'), null,
  'Writing starts: the assignment becomes the piece');
-- Clients never read contributors.user_id (blind review): checked here
-- as the database owner.
select pg_temp.logout();
select is(
  (select c.user_id from journal.pieces p join journal.contributors c on c.id = p.contributor_id
   where p.id = (select piece_id from journal.story_assignments where id = 'a0000000-0000-0000-0000-0000000ad0a1')),
  '00000000-0000-0000-0000-0000000ad002'::uuid,
  'Whoever starts the piece is its byline at once'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select is((select stage from journal.desk_board('news')
  where id = (select piece_id from journal.story_assignments where id = 'a0000000-0000-0000-0000-0000000ad0a1')),
  'drafting', 'The piece moves to Drafting');
insert into journal.piece_credits (piece_id, contributor_id, role, sort)
select piece_id, 'c0000000-0000-0000-0000-0000000ad003', 'reporter', 1
from journal.story_assignments where id = 'a0000000-0000-0000-0000-0000000ad0a1';

select pg_temp.login_as('00000000-0000-0000-0000-0000000ad003');
select ok(exists (select 1 from core.my_todos() where kind = 'credit'),
  'A co-writer accepts the credit from Today');
select lives_ok(
  $$ select journal.answer_credit(
    (select piece_id from journal.my_credits_to_accept() limit 1),
    'c0000000-0000-0000-0000-0000000ad003', true) $$,
  'and accepts it'
);
select ok(not exists (select 1 from core.my_todos() where kind = 'credit'),
  'which clears the to-do');

select lives_ok(
  $$ insert into journal.reading_views (entry_id) values (gen_random_uuid()) $$,
  'Every view of work under review is logged'
);

select * from finish();
rollback;
