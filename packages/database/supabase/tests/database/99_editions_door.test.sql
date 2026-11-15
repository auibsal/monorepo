-- Editions is the one door for outside work.
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

-- Editions is the one door (decisions.md, Qirtas): one call per Edition;
-- Video's films with their declarations; Voices' letters and op-eds to no
-- call, by name, within their lengths.

select plan(14);

-- Edition 1, titled, with its call open for films.
update journal.issues set title_en = 'Test title', title_ar = 'عنوان الاختبار' where slug = 'edition-1';
update journal.calls c set is_published = true, opens_at = now() - interval '1 day'
from journal.issues i where i.id = c.issue_id and i.slug = 'edition-1';

select pg_temp.make_user('00000000-0000-0000-0000-0000000e1d01', 'writer.ed@auib.edu.iq', 'Ed Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e1d02', 'voices.ed@auib.edu.iq', 'Voices Editor');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e1d02', 'voices_editor');
insert into membership.pledges (user_id, pledge_type, version)
select '00000000-0000-0000-0000-0000000e1d01', t, '1'
from unnest(enum_range(null::membership.pledge_type)) t;

select throws_ok(
  $$ insert into journal.calls (issue_id, title_en, title_ar, opens_at, closes_at)
     select issue_id, 'Again', 'مجددًا', now(), now() + interval '1 day'
     from journal.calls limit 1 $$,
  '23505', null, 'An Edition has one call');
select throws_ok(
  $$ insert into journal.calls (title_en, title_ar, opens_at, closes_at)
     values ('Nowhere', 'لا مكان', now(), now() + interval '1 day') $$,
  '23502', null, 'A call always belongs to an Edition');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e1d01');
select throws_ok(
  $$ insert into journal.submissions (category, language, title, video_url, human_authorship_confirmed,
       first_publication_confirmed)
     values ('short_film', 'en', 'A film', 'https://example.org/f', true, true) $$,
  '23514', 'video_declarations', 'A film declares its length, captions and releases');
select lives_ok(
  $$ insert into journal.submissions (category, language, title, video_url, human_authorship_confirmed,
       first_publication_confirmed, running_minutes, captions_confirmed, release_confirmed)
     values ('short_film', 'en', 'A film', 'https://example.org/f', true, true, 12, true, true) $$,
  'A member sends a film to the open Edition''s call');
select throws_ok(
  $$ insert into journal.submissions (category, language, title, video_url, human_authorship_confirmed,
       first_publication_confirmed, running_minutes, captions_confirmed, release_confirmed)
     values ('short_film', 'en', 'Too long', 'https://example.org/g', true, true, 16, true, true) $$,
  '23514', null, 'A film runs at most 15 minutes');

select lives_ok(
  $$ insert into journal.submissions (category, language, title, body_html, human_authorship_confirmed, first_publication_confirmed)
     values ('letter_to_editor', 'en', 'On the library hours', '<p>Please open later.</p>', true, true) $$,
  'A member writes to the editor');
select is((select call_id is null from journal.submissions where title = 'On the library hours'), true,
  'A letter goes to no call: the Voices desk reads it by name');
select throws_ok(
  $$ insert into journal.submissions (category, language, title, body_html, human_authorship_confirmed, pen_name)
     values ('letter_to_editor', 'en', 'Hidden', '<p>x</p>', true, 'Owl') $$,
  '22023', 'own_name_required', 'Opinion runs under the writer''s own name');
select throws_ok(
  format($$ insert into journal.submissions (category, language, title, body_html, human_authorship_confirmed)
     values ('letter_to_editor', 'en', 'Long letter', %L, true) $$, '<p>' || repeat('word ', 301) || '</p>'),
  '23514', 'letter_too_long', 'A letter runs to 300 words at most');
select throws_ok(
  format($$ insert into journal.submissions (category, language, title, body_html, human_authorship_confirmed, first_publication_confirmed, about_writer)
     values ('opinion_essay', 'en', 'Short op-ed', %L, true, true, 'is a junior studying business at AUIB') $$,
     '<p>' || repeat('word ', 100) || '</p>'),
  '23514', 'op_ed_length', 'An op-ed runs 600 to 800 words');
select throws_ok(
  format($$ insert into journal.submissions (category, language, title, body_html, human_authorship_confirmed)
     values ('opinion_essay', 'en', 'Unsigned op-ed', %L, true) $$, '<p>' || repeat('word ', 700) || '</p>'),
  '23514', 'about_writer_required', 'An op-ed ends with the line about its writer');
select throws_ok(
  $$ insert into journal.submissions (category, language, title, body_html, human_authorship_confirmed)
     values ('review', 'en', 'A review', '<p>x</p>', true) $$,
  '22023', 'voices_letters_and_op_eds', 'Voices takes letters and op-eds; the rest is staff work');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e1d02');
select is((select count(*) from journal.submissions where title = 'On the library hours')::integer, 1,
  'The Voices Editor reads the letter by name');
select pg_temp.logout();
select is(private.html_word_count('<p>One two</p><p>three&nbsp;four</p>'), 4,
  'Words are counted from the text, not the markup');

select * from finish();
rollback;
