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

-- Qirtas's games (owner, Nov 5, 2026): the editors alone write them, the
-- published ones were removed, and the kinds are those the site can also
-- make daily: crossword, word search and anagram.

select plan(18);

select pg_temp.make_user('00000000-0000-0000-0000-00000000a001', 'puzzler@auib.edu.iq', 'Puzzle Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000a002', 'reader@auib.edu.iq', 'Reader');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000a001', 'news_editor');

-- What the editors had published is gone, the starter puzzles with it.
select pg_temp.logout();
select is((select count(*) from journal.puzzles where status = 'published')::integer, 0,
  'No published puzzle is left');
select is((select count(*) from journal.pieces where desk = 'games')::integer, 0,
  'No Games piece is left');
select ok(not journal.is_current_category('quiz') and not journal.is_current_category('word_ladder')
  and not journal.is_current_category('riddle') and not journal.is_current_category('name_the_book'),
  'The quiz, the word ladder, riddles and name the book are retired');
select ok(journal.is_current_category('crossword') and journal.is_current_category('anagram'),
  'The crossword and the anagram stay');

select pg_temp.login_anon();
select throws_ok(
  $$insert into journal.puzzles (slug, kind, language, title_en) values ('anon', 'crossword', 'en', 'x')$$,
  '42501', null, 'Readers cannot add puzzles'
);

-- A member without a Qirtas role cannot write, nor send a game.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$insert into journal.puzzles (slug, kind, language, title_en) values ('member', 'crossword', 'en', 'x')$$,
  '42501', null, 'A member without a Qirtas role cannot add puzzles'
);
select throws_ok(
  $$insert into journal.submissions (category, title, language, human_authorship_confirmed)
    values ('crossword', 'My crossword', 'en', true)$$,
  '22023', 'games_by_editors', 'A member cannot send a game'
);
select throws_ok(
  $$insert into journal.submission_drafts (category) values ('anagram')$$,
  '22023', 'games_by_editors', 'nor keep a draft of one'
);

-- A desk editor writes a draft; readers do not see it until it is published.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$insert into journal.puzzles (slug, kind, language, title_en, data)
    values ('draft-crossword', 'crossword', 'en', 'Draft', '{"rows": 2}')$$,
  'A desk editor adds a draft crossword'
);
select lives_ok(
  $$insert into journal.puzzles (slug, kind, language, title_ar, data)
    values ('draft-anagram', 'anagram', 'ar', 'كلمات مبعثرة', '{"items": []}')$$,
  'and an anagram'
);
select throws_ok(
  $$insert into journal.puzzles (slug, kind, language, title_en)
    values ('draft-quiz', 'quiz', 'en', 'Quiz')$$,
  '23514', null, 'A retired kind is refused'
);
select is((select created_by from journal.puzzles where slug = 'draft-crossword'),
  '00000000-0000-0000-0000-00000000a001'::uuid, 'The puzzle records who made it');
select throws_ok(
  $$update journal.puzzles set status = 'published' where slug = 'draft-crossword'$$,
  '23514', null, 'A puzzle is not published without a publication time'
);
select throws_ok(
  $$update journal.puzzles set made_with_ai = true where slug = 'draft-crossword'$$,
  '42501', null, 'Editors cannot mark a puzzle as made with an AI tool'
);

select pg_temp.login_anon();
select is((select count(*) from journal.puzzles where slug = 'draft-crossword')::integer, 0,
  'Readers do not see drafts');

select pg_temp.login_as('00000000-0000-0000-0000-00000000a001');
update journal.puzzles set status = 'published', published_at = now() where slug = 'draft-crossword';
select pg_temp.login_anon();
select is((select count(*) from journal.puzzles where slug = 'draft-crossword')::integer, 1,
  'Readers see the puzzle once it is published');

select pg_temp.login_as('00000000-0000-0000-0000-00000000a001');
delete from journal.puzzles where slug = 'draft-crossword';
select is((select count(*) from journal.puzzles where slug = 'draft-crossword')::integer, 0,
  'A desk editor deletes a puzzle');

-- Third-party apps without the journal area see nothing.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a001', '{"client_id": "00000000-0000-0000-0000-0000000000c1"}');
select is((select count(*) from journal.puzzles)::integer, 0,
  'An app without the journal area reads no puzzles');

select * from finish();
rollback;
