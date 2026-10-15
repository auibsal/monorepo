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

-- Waraq's games: editor-written puzzles and the starter puzzles.

select plan(14);

select pg_temp.make_user('00000000-0000-0000-0000-00000000a001', 'puzzler@auib.edu.iq', 'Puzzle Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000a002', 'reader@auib.edu.iq', 'Reader');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000a001', 'news_editor');

-- Readers see the four starter puzzles, marked as made with an AI tool.
select pg_temp.login_anon();
select is((select count(*) from journal.puzzles)::integer, 4, 'Anyone reads the published starter puzzles');
select is((select count(*) from journal.puzzles where made_with_ai)::integer, 4,
  'The starter puzzles say they were made with an AI tool');
select is((select count(*) from journal.puzzles where language = 'ar')::integer, 2,
  'Two of them are in Arabic');
select throws_ok(
  $$insert into journal.puzzles (slug, kind, language, title_en) values ('anon', 'crossword', 'en', 'x')$$,
  '42501', null, 'Readers cannot add puzzles'
);

-- A member without a Waraq role cannot write.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$insert into journal.puzzles (slug, kind, language, title_en) values ('member', 'crossword', 'en', 'x')$$,
  '42501', null, 'A member without a Waraq role cannot add puzzles'
);

-- A desk editor writes a draft; readers do not see it until it is published.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$insert into journal.puzzles (slug, kind, language, title_en, data)
    values ('draft-crossword', 'crossword', 'en', 'Draft', '{"rows": 2}')$$,
  'A desk editor adds a draft puzzle'
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

select pg_temp.login_as('00000000-0000-0000-0000-00000000a002');
update journal.puzzles set title_en = 'Mine' where slug = 'first-crossword';
select pg_temp.login_anon();
select is((select title_en from journal.puzzles where slug = 'first-crossword'), 'The first crossword',
  'A member cannot change a puzzle');

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
select pg_temp.login_as('00000000-0000-0000-0000-00000000a002', '{"client_id": "00000000-0000-0000-0000-0000000000c1"}');
select is((select count(*) from journal.puzzles)::integer, 0,
  'An app without the journal area reads no puzzles');

select * from finish();
rollback;
