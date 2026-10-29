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

-- Waraq: desks, the named desks' pipeline, the piece workflow, the
-- publish rule, the front page, pen names and Editions.

delete from journal.issues;
-- The News desk's archive (migration 20261014000300) is published content;
-- these checks count pieces from a clean desk.
delete from journal.pieces;

select plan(50);

-- People.
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-00000000e1c0', 'eic@auib.edu.iq', 'Editor in Chief');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ae00', 'me@auib.edu.iq', 'Managing Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ae11', 'news@auib.edu.iq', 'News Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ae12', 'letters@auib.edu.iq', 'Letters Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000c0b1', 'copy@auib.edu.iq', 'Copy Chief');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ae13', 'both@auib.edu.iq', 'Two Hats');
select pg_temp.make_user('00000000-0000-0000-0000-0000000005a1', 'sm@auib.edu.iq', 'Submissions Manager');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'reporter@auib.edu.iq', 'Sara Reporter');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'poet@auib.edu.iq', 'Omar Poet');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'other@auib.edu.iq', 'Other Member');

select pg_temp.grant_role('00000000-0000-0000-0000-00000000e1c0', 'eic');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ae00', 'managing_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ae11', 'news_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ae12', 'letters_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000c0b1', 'copy_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ae13', 'news_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ae13', 'managing_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000005a1', 'submissions_manager');

insert into membership.pledges (user_id, pledge_type, version)
select u, t, '1'
from unnest(array[
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000e1c0'
]::uuid[]) u, unnest(enum_range(null::membership.pledge_type)) t;

insert into journal.issues (id, volume, number, slug, title_en, title_ar, status, publish_at) values
  ('1a000000-0000-0000-0000-000000000001', 1, 1, 'edition-1', 'Edition 1', 'الإصدار الأول',
    'scheduled', now() + interval '60 days');
insert into journal.calls (id, issue_id, title_en, title_ar, opens_at, closes_at, is_published) values
  ('ca000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001',
    'Edition 1', 'الإصدار الأول', now() - interval '1 day', now() + interval '30 days', true);

-- ── Desks ───────────────────────────────────────────────────────────────────

select is(journal.desk_of('report'), 'news'::journal.desk, 'A report is News');
select is(journal.desk_of('comic'), 'gallery'::journal.desk, 'A comic is Gallery');
select is(journal.desk_of('poetry'), 'letters'::journal.desk, 'A poem is Letters');
select is(journal.desk_of('letter_to_editor'), 'voices'::journal.desk, 'A letter to the editor is Voices');

-- ── Submitting ──────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ insert into journal.submissions (category, language, title, deck, body_html, human_authorship_confirmed)
     values ('report', 'en', 'Book drive results', 'Second Chapter collected books.', '<p>Story</p>', true) $$,
  'A member sends news to the News desk, without a call'
);
select throws_ok(
  $$ insert into journal.submissions (call_id, category, language, title, body_html, human_authorship_confirmed)
     values ('ca000000-0000-0000-0000-000000000001', 'report', 'en', 'News to a call', '<p>x</p>', true) $$,
  '22023', null, 'News is not sent to an Edition call'
);
select throws_ok(
  $$ insert into journal.submissions (category, language, title, body_html, human_authorship_confirmed, first_publication_confirmed)
     values ('poetry', 'en', 'A poem without a call', '<p>x</p>', true, true) $$,
  'P0002', null, 'Letters answer a call'
);
select throws_ok(
  $$ insert into journal.submissions (call_id, category, language, title, human_authorship_confirmed, first_publication_confirmed)
     values ('ca000000-0000-0000-0000-000000000001', 'art', 'en', 'A photo', true, true) $$,
  '23514', null, 'Gallery work needs consent for identifiable people'
);
select throws_ok(
  $$ insert into journal.submissions (call_id, category, language, title, body_html, human_authorship_confirmed)
     values ('ca000000-0000-0000-0000-000000000001', 'poetry', 'en', 'Not declared', '<p>x</p>', true) $$,
  '23514', null, 'Letters declare first publication'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into journal.submissions (call_id, category, language, title, body_html, pen_name,
       human_authorship_confirmed, first_publication_confirmed)
     values ('ca000000-0000-0000-0000-000000000001', 'poetry', 'en', 'Night River', '<p>Water</p>',
       'The Quiet One', true, true) $$,
  'A member sends a poem to the Edition call under a pen name'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000e1c0');
select throws_ok(
  $$ insert into journal.submissions (call_id, category, language, title, body_html,
       human_authorship_confirmed, first_publication_confirmed)
     values ('ca000000-0000-0000-0000-000000000001', 'poetry', 'en', 'Editor''s poem', '<p>x</p>', true, true) $$,
  '42501', null, 'The Editor-in-Chief does not submit to an Edition while in office'
);

select pg_temp.logout();
create function pg_temp.news_sub() returns uuid language sql as $$
  select id from journal.submissions where title = 'Book drive results';
$$;
create function pg_temp.poem_sub() returns uuid language sql as $$
  select id from journal.submissions where title = 'Night River';
$$;
grant execute on function pg_temp.news_sub(), pg_temp.poem_sub() to public;

-- ── The News desk ───────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae12');
select is((select count(*) from journal.submissions where call_id is null)::integer, 0,
  'The Letters Editor does not see the News desk''s work');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select is((select author_name_en from journal.desk_queue()), 'Sara Reporter',
  'The News Editor sees news by name');
select journal.transition_submission(pg_temp.news_sub(), 'intake_check');
select journal.transition_submission(pg_temp.news_sub(), 'in_review');
select lives_ok($$ select journal.decide_named(pg_temp.news_sub(), 'accept') $$,
  'The News Editor accepts the story');

select pg_temp.logout();
create function pg_temp.news() returns uuid language sql security definer as $$
  select id from journal.pieces where submission_id = pg_temp.news_sub();
$$;
grant execute on function pg_temp.news() to public;
select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');

select is((select status from journal.pieces where id = pg_temp.news()), 'editing',
  'Accepting makes the piece, in Editing');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from journal.pieces)::integer, 1, 'The author reads their own piece');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select is((select count(*) from journal.pieces)::integer, 0, 'Other members do not');
select pg_temp.login_anon();
select is((select count(*) from journal.pieces)::integer, 0, 'Visitors see nothing before it is published');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select throws_ok(
  $$ update journal.pieces set status = 'published' where id = pg_temp.news() $$,
  '42501', null, 'Status moves only through the publish rule'
);
select throws_ok(
  $$ select journal.approve_piece(pg_temp.news(), 'desk') $$,
  '22023', null, 'No approval before the author approves the text'
);
update journal.pieces set title_ar = 'نتائج حملة الكتب' where id = pg_temp.news();
select journal.request_author_approval(pg_temp.news());
select pg_temp.logout();
select is((select count(*) from core.outbox where kind = 'journal.final_check')::integer, 1,
  'The author is asked for the final check');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is(journal.author_approve(pg_temp.news()), 'author_approved', 'The author approves the text');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select throws_ok(
  $$ select journal.approve_piece(pg_temp.news(), 'chief') $$,
  '42501', null, 'A desk editor cannot give the chief approval'
);
-- News needs only the desk editor: the rule runs at once, and the missing
-- agreement sends the piece back.
select is(journal.approve_piece(pg_temp.news(), 'desk'), 'editing',
  'The News Editor approves for the desk; without the agreement the rule sends it back');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae13');
select throws_ok(
  $$ select journal.withdraw_approval(pg_temp.news(), 'desk') $$,
  'P0002', null, 'Only the approver withdraws an approval'
);
select pg_temp.logout();
select matches((select edit_note from journal.pieces where id = pg_temp.news()),
  'agreement', 'with the reason');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select journal.sign_agreement(pg_temp.news_sub(), 'Sara Reporter');
select pg_temp.logout();
select is((select status from journal.pieces where id = pg_temp.news()), 'published',
  'Signing was all it waited for: the piece publishes itself');

select pg_temp.login_anon();
select is((select count(*) from journal.pieces)::integer, 1, 'Visitors read the published story');
select throws_ok($$ select user_id from journal.contributors $$, '42501', null,
  'Nobody can read which account a contributor is');
select pg_temp.logout();
select is((select count(*) from core.outbox where kind = 'journal.piece_published')::integer, 1,
  'Publishing is announced to the outbox');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select throws_ok($$ select journal.set_front(pg_temp.news(), 1::smallint) $$, '42501', null,
  'Only the Editor-in-Chief sets the front page');
select pg_temp.login_as('00000000-0000-0000-0000-00000000e1c0');
select lives_ok($$ select journal.set_front(pg_temp.news(), 1::smallint) $$, 'The Editor-in-Chief makes it the lead');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
insert into journal.corrections (piece_id, note_en) values (pg_temp.news(), 'An earlier version gave the wrong total.');
select pg_temp.login_anon();
select is((select count(*) from journal.corrections)::integer, 1, 'Corrections are public and dated');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
insert into journal.piece_notes (piece_id, body) values (pg_temp.news(), 'Please check the total.');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from journal.piece_thread(pg_temp.news()) where not from_author and writer_name_en = 'News Editor')::integer, 1,
  'The author reads the editor''s note, signed');
select pg_temp.logout();
select is((select count(*) from core.outbox where kind = 'journal.piece_note')::integer, 1,
  'and is emailed about it');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select throws_ok($$ select journal.unpublish_piece(pg_temp.news(), '') $$, '22023', null,
  'Unpublishing needs a note');
select lives_ok($$ select journal.unpublish_piece(pg_temp.news(), 'Removed at the author''s request') $$,
  'Unpublishing is one click with a note');
select pg_temp.login_anon();
select is((select count(*) from journal.pieces)::integer, 0, 'An unpublished piece is gone from the site');

-- ── Two people approve ──────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae13');
create temp table staff as select journal.create_staff_piece(
  'report', 'en', 'Salon tonight', 'الصالون الليلة',
  (select id from journal.contributors limit 1)) as id;
grant select on staff to public;
update journal.piece_bodies set body_en = '<p>Tonight.</p>' where piece_id = (select id from staff);
update journal.pieces set deck_en = 'A first Salon.' where id = (select id from staff);
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0b1');
select lives_ok($$ select journal.approve_piece((select id from staff), 'copy') $$,
  'The Copy Chief may record a style check before the desk');
select pg_temp.login_as('00000000-0000-0000-0000-00000000ae13');
select is(journal.approve_piece((select id from staff), 'desk'), 'published',
  'A staff piece on a named desk needs no author approval and publishes on the desk editor''s word');
select pg_temp.logout();
select is((select count(*) from journal.approvals where piece_id = (select id from staff))::integer, 2,
  'Both approvals are on record');

-- ── Letters: blind, pen name, Edition launch ────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000005a1');
select journal.transition_submission(pg_temp.poem_sub(), 'intake_check');
select journal.transition_submission(pg_temp.poem_sub(), 'in_review');
select pg_temp.logout();
create function pg_temp.poem_entry() returns uuid language sql security definer as $$
  select blind_entry_id from journal.blind_keys where submission_id = pg_temp.poem_sub();
$$;
grant execute on function pg_temp.poem_entry() to public;

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae12');
select journal.transition_submission(pg_temp.poem_entry(), 'selection');
select lives_ok($$ select journal.decide(pg_temp.poem_entry(), 'accept') $$,
  'The Letters Editor decides by blind id');
select pg_temp.logout();
select is(
  (select c.name_en || '/' || c.is_pen_name from journal.pieces p join journal.contributors c on c.id = p.contributor_id
   where p.submission_id = pg_temp.poem_sub()),
  'The Quiet One/true', 'A pen name gets its own contributor record');
select pg_temp.login_as('00000000-0000-0000-0000-00000000ae12');
select is((select author_name_en from journal.entry_author(pg_temp.poem_entry())), 'The Quiet One',
  'After the decision the editors learn the pen name, not the real name');

select pg_temp.logout();
create function pg_temp.poem() returns uuid language sql security definer as $$
  select id from journal.pieces where submission_id = pg_temp.poem_sub();
$$;
grant execute on function pg_temp.poem() to public;

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae12');
update journal.pieces set title_ar = 'نهر الليل' where id = pg_temp.poem();
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select journal.sign_agreement(pg_temp.poem_sub(), 'Omar Poet');
select journal.author_approve(pg_temp.poem());
select pg_temp.login_as('00000000-0000-0000-0000-00000000ae12');
select is(journal.approve_piece(pg_temp.poem(), 'desk'), 'author_approved',
  'An Edition piece waits for the chief after the desk');
select throws_ok($$ select journal.approve_piece(pg_temp.poem(), 'chief') $$, '42501', null,
  'The desk editor cannot give the chief approval');
select pg_temp.login_as('00000000-0000-0000-0000-00000000ae00');
select is(journal.approve_piece(pg_temp.poem(), 'chief'), 'scheduled',
  'With the chief''s approval the Edition piece waits for the launch; no copy check is needed');
select pg_temp.logout();
select ok((select publish_at from journal.pieces where id = pg_temp.poem())
  = (select publish_at from journal.issues), 'and goes out at the Edition''s launch');

update journal.issues set publish_at = now() - interval '1 minute';
update journal.pieces set publish_at = now() - interval '1 minute' where id = pg_temp.poem();
select ok(private.publish_scheduled() >= 2, 'At launch, the Edition and its pieces publish');
select is((select status from journal.pieces where id = pg_temp.poem()), 'published', 'The poem is out');

select * from finish();
rollback;
