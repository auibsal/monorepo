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

-- Qirtas's games (decisions §5): generated daily and checked by the
-- editors in a queue; hand-made puzzles are retired; members send none.

select plan(11);

select pg_temp.make_user('00000000-0000-0000-0000-00000000a001', 'puzzler@auib.edu.iq', 'Games Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000a002', 'reader@auib.edu.iq', 'Reader');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000a001', 'games_editor');

select pg_temp.logout();
select hasnt_table('journal', 'puzzles', 'Hand-made puzzles are retired');
select is((select count(*) from journal.pieces where desk = 'games')::integer, 0,
  'No Games piece is left');
select ok(not journal.is_current_category('quiz') and not journal.is_current_category('word_ladder')
  and not journal.is_current_category('riddle') and not journal.is_current_category('name_the_book'),
  'The quiz, the word ladder, riddles and name the book are retired');
select ok(journal.is_current_category('crossword') and journal.is_current_category('anagram'),
  'The crossword and the anagram stay');

-- A member without a Qirtas role cannot send a game, nor check one.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$insert into journal.submissions (category, title, language, human_authorship_confirmed)
    values ('crossword', 'My crossword', 'en', true)$$,
  '22023', 'games_by_editors', 'A member cannot send a game'
);
select throws_ok(
  $$insert into journal.submission_drafts (category) values ('anagram')$$,
  '22023', 'games_by_editors', 'nor keep a draft of one'
);
select throws_ok(
  $$insert into journal.game_checks (game_day, lang) values (500, 'en')$$,
  '42501', null, 'nor check a day''s games'
);

-- The Games Editor checks the coming days' games, or flags one.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$insert into journal.game_checks (game_day, lang) values (500, 'en')$$,
  'The Games Editor checks a day''s games'
);
select lives_ok(
  $$insert into journal.game_checks (game_day, lang, flagged, note) values (500, 'ar', true, 'A clue is wrong')$$,
  'or flags them with a note'
);
select is((select checked_by from journal.game_checks where game_day = 500 and lang = 'en'),
  '00000000-0000-0000-0000-00000000a001'::uuid, 'The check records who made it');

select pg_temp.login_as('00000000-0000-0000-0000-00000000a002');
select is((select count(*) from journal.game_checks)::integer, 0,
  'Readers do not see the queue');

select * from finish();
rollback;
