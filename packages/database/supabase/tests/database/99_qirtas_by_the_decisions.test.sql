-- Readers read the work, never the file: F-40 signed before the text, the
-- columns closed, originals by role and every opening kept.
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

-- Qirtas as decisions.md has it: the Managing Editor holds names and never
-- reads blind work; two people and the copy edit approve; an editor sets the
-- date a piece carries, kept with who set it; the 22 pieces; "From the
-- Society".

select plan(21);

-- ── The 22 pieces made on Oct 14 ────────────────────────────────────────────

select is((select count(*)::integer from journal.pieces where slug in (
    'iraq-energy-institute-opens-offices-at-auib', 'auib-graduates-its-first-class',
    'auib-and-somo-discuss-energy-forum', 'society-ratifies-its-constitution-on-charter-day',
    'qirtas-launches-as-one-paper', 'society-publishes-its-founding-documents',
    'society-publishes-its-member-handbook')), 0,
  'The pre-2026 pieces, Charter Day and the Society''s own posts leave Qirtas');
select is((select count(*)::integer from core.announcements
    where sent_at is null and title_en in (
      'Qirtas launches: news, letters and art in one bilingual paper',
      'Society puts its rulebooks and three-year plan online',
      'The Society of Arts and Letters sets out what membership means')), 3,
  'The Society''s posts wait, unsent, in "From the Society" for Media to edit');
select is((select count(*)::integer from journal.pieces
    where created_at::date = date '2026-10-14' and dated_at is null and status = 'unpublished'), 0,
  'The AUIB pieces kept keep their event dates as the dates they will carry');

delete from journal.issues;
delete from journal.pieces;

select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000006a1', 'me@auib.edu.iq', 'Managing Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000006e1', 'eic@auib.edu.iq', 'Editor-in-Chief');
select pg_temp.make_user('00000000-0000-0000-0000-0000000006b1', 'voices@auib.edu.iq', 'Voices Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000006c1', 'copy@auib.edu.iq', 'Copy Chief');
select pg_temp.make_user('00000000-0000-0000-0000-0000000006d1', 'member@auib.edu.iq', 'Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'author1@auib.edu.iq', 'Author One');

insert into journal.issues (id, volume, number, slug, title_en, title_ar)
values ('1a000000-0000-0000-0000-000000000001', 1, 1, 'issue-1', 'Firsts', 'أوّل مرّة');
insert into journal.calls (id, issue_id, title_en, title_ar, opens_at, closes_at, is_published)
values ('ca000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001',
  'Issue 1', 'العدد الأول', now() - interval '1 day', now() + interval '30 days', true);

select pg_temp.grant_role('00000000-0000-0000-0000-0000000006a1', 'managing_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000006e1', 'eic');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000006b1', 'voices_editor');

insert into membership.pledges (user_id, pledge_type, version)
select u, t, '1'
from unnest(array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000006e1',
  '00000000-0000-0000-0000-0000000006a1']::uuid[]) u, unnest(enum_range(null::membership.pledge_type)) t;

-- ── Names or text, never both ───────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
insert into journal.submissions (call_id, category, language, title, body_html,
  human_authorship_confirmed, first_publication_confirmed, consent_confirmed)
values ('ca000000-0000-0000-0000-000000000001',
  'poetry', 'en', 'First light', '<p>The text</p>', true, true, true);

select pg_temp.login_as('00000000-0000-0000-0000-0000000006a1');
select lives_ok(
  $$ select journal.transition_submission((select id from journal.submissions), 'intake_check'),
            journal.transition_submission((select id from journal.submissions), 'in_review') $$,
  'The Managing Editor takes a submission through intake'
);
select ok(not private.can_read_entry((select id from journal.blind_entries)),
  'and never reads it while it is read blind');
select is((select count(*)::integer from journal.entry_text((select id from journal.blind_entries))), 0,
  'The text never reaches the Managing Editor');
select ok(not access.has_permission('journal.decide'),
  'The Managing Editor does not decide blind work');

select pg_temp.login_as('00000000-0000-0000-0000-0000000006e1');
select ok(private.can_read_entry((select id from journal.blind_entries)),
  'The Editor-in-Chief, who holds no names, reads it');

-- ── Two people and the copy edit ────────────────────────────────────────────

select pg_temp.logout();
select is(private.required_approvals('news'), array['desk', 'chief', 'copy'],
  'A text piece needs the section editor, the second approval and the copy edit');
select is(private.required_approvals('gallery'), array['desk', 'chief'],
  'Every piece needs two people');

select pg_temp.login_as('00000000-0000-0000-0000-0000000006b1');
create temp table op as select journal.create_staff_piece(
  'column', 'en', 'A column', 'عمود',
  (select id from journal.contributors limit 1)) as id;
grant select on op to public;
update journal.piece_bodies set body_en = '<p>Words.</p>' where piece_id = (select id from op);
select is(journal.approve_piece((select id from op), 'desk'), 'editing',
  'The Voices Editor approves for the section');
select pg_temp.login_as('00000000-0000-0000-0000-0000000006e1');
select is(journal.approve_piece((select id from op), 'copy'), 'editing',
  'While no one holds the copy desk, the Editor-in-Chief copy edits');
select pg_temp.login_as('00000000-0000-0000-0000-0000000006a1');
select is(journal.approve_piece((select id from op), 'chief'), 'published',
  'With the Managing Editor''s approval it publishes');

-- ── The date a piece carries ────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000006b1');
select throws_ok($$ select journal.date_piece((select id from op), now() + interval '1 day') $$,
  '22023', null, 'A later date is a schedule, not a date');
select lives_ok($$ select journal.date_piece((select id from op), timestamptz '2026-10-01 18:00+03') $$,
  'The section editor sets the date a piece carries');
select is((select published_at from journal.pieces where id = (select id from op)),
  timestamptz '2026-10-01 18:00+03', 'A published piece takes it at once');
select is((select set_by from journal.piece_dates where piece_id = (select id from op)),
  '00000000-0000-0000-0000-0000000006b1'::uuid, 'and who set it, and when, is kept');

select pg_temp.login_as('00000000-0000-0000-0000-0000000006d1');
select throws_ok($$ select journal.date_piece((select id from op), now()) $$,
  'P0002', null, 'A member can''t date a piece');
select is((select count(*)::integer from journal.piece_dates), 0, 'or read the dates kept');
select pg_temp.login_anon();
select throws_ok($$ select count(*) from journal.piece_dates $$, '42501', null,
  'Nor can a visitor');

-- ── "From the Society" ──────────────────────────────────────────────────────

select pg_temp.logout();
insert into core.announcements (title_en, title_ar, body_en, body_ar, sent_at)
values ('Sent', 'أُرسل', 'Sent.', 'أُرسل.', now());
select pg_temp.login_anon();
select is((select array_agg(title_en) from core.society_notices(50)), array['Sent'],
  'Visitors read the notices sent, and none waiting');

select * from finish();
rollback;
