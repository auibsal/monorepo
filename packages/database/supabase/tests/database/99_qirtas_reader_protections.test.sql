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

delete from journal.issues;

select plan(18);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000005a1', 'sm@auib.edu.iq', 'Submissions Manager');
select pg_temp.make_user('00000000-0000-0000-0000-0000000005e1', 'eic@auib.edu.iq', 'Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000005b1', 'r1@auib.edu.iq', 'Reader One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000005b2', 'r2@auib.edu.iq', 'Reader Two');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'author1@auib.edu.iq', 'Author One');

insert into journal.issues (id, volume, number, slug, title_en, title_ar)
values ('1a000000-0000-0000-0000-000000000001', 1, 1, 'issue-1', 'Firsts', 'أوّل مرّة');
insert into journal.calls (id, issue_id, title_en, title_ar, opens_at, closes_at, is_published)
values ('ca000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001',
  'Issue 1', 'العدد الأول', now() - interval '1 day', now() + interval '30 days', true);

select pg_temp.grant_role('00000000-0000-0000-0000-0000000005a1', 'managing_editor', 'issue', '1a000000-0000-0000-0000-000000000001');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000005e1', 'eic', 'issue', '1a000000-0000-0000-0000-000000000001');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000005b1', 'reader', 'issue', '1a000000-0000-0000-0000-000000000001');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000005b2', 'reader', 'issue', '1a000000-0000-0000-0000-000000000001');

insert into membership.pledges (user_id, pledge_type, version)
select '00000000-0000-0000-0000-0000000000a1', t, '1'
from unnest(enum_range(null::membership.pledge_type)) t;

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
insert into journal.submissions (call_id, category, language, title, body_html,
  human_authorship_confirmed, first_publication_confirmed, consent_confirmed)
values ('ca000000-0000-0000-0000-000000000001',
  'poetry', 'en', 'First light', '<p>The text</p>', true, true, true);
select pg_temp.logout();
insert into journal.submission_files (id, submission_id, kind, storage_path, mime_type, size_bytes)
select 'f1000000-0000-0000-0000-000000000001', s.id, 'manuscript', s.id || '/poem.pdf', 'application/pdf', 1000
from journal.submissions s;

-- ── Originals in intake ─────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select ok(journal.open_original('f1000000-0000-0000-0000-000000000001') like '%/poem.pdf', 'The author opens their own original');
select pg_temp.login_as('00000000-0000-0000-0000-0000000005a1');
select ok(journal.open_original('f1000000-0000-0000-0000-000000000001') like '%/poem.pdf', 'The Submissions Manager opens it in intake');
select is((select count(*)::integer from journal.original_openings), 1,
  'Only the Submissions Manager''s opening is kept, not the author''s');

select lives_ok(
  $$ select journal.transition_submission((select id from journal.submissions), 'intake_check'),
            journal.transition_submission((select id from journal.submissions), 'in_review') $$,
  'Into review'
);
select throws_ok($$ select journal.open_original('f1000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Once in review, the Submissions Manager no longer opens the original');
select lives_ok(
  $$ select journal.assign_reader(b.id, '00000000-0000-0000-0000-0000000005b1', 1),
            journal.assign_reader(b.id, '00000000-0000-0000-0000-0000000005b2', 2)
     from journal.blind_entries b $$,
  'Two readers are assigned'
);

-- ── Readers ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000005b1');
select throws_ok($$ select body_html from journal.blind_entries $$,
  '42501', null, 'The text is not a column readers select');
select lives_ok($$ select id, blind_id, title from journal.blind_entries $$,
  'The rest of the entry reads as before');
select throws_ok($$ select * from journal.entry_text((select id from journal.blind_entries)) $$,
  'P0001', null, 'No text before the readers'' pledge');
select throws_ok($$ select journal.open_original('f1000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'A reader never opens the original');
select throws_ok($$ select journal.sign_reader_pledge(false) $$,
  '23514', null, 'F-40 is signed only with the agreement to sign electronically');
select isnt(journal.sign_reader_pledge(true), null, 'The reader signs F-40');
select is(
  (select signer_name || ' · ' || status from governance.form_submissions where form_key = 'confidentiality-agreement'),
  'Reader One · closed',
  'The signed copy is F-40, in the reader''s platform name, with nothing left to handle'
);
select is((select body_html from journal.entry_text((select id from journal.blind_entries))),
  '<p>The text</p>', 'After the pledge, the reader reads the text');
select is((select current from journal.my_reader_pledge()), true, 'The pledge is the current one');
select is((select count(*)::integer from journal.original_openings), 0, 'Readers see no openings');

select pg_temp.login_as('00000000-0000-0000-0000-0000000005b2');
select is((select count(*)::integer from governance.form_submissions where form_key = 'confidentiality-agreement'), 0,
  'A reader sees only their own signed F-40');

-- ── After acceptance ────────────────────────────────────────────────────────

select pg_temp.logout();
update journal.submissions set status = 'accepted' where id = (select id from journal.submissions);
select pg_temp.login_as('00000000-0000-0000-0000-0000000005e1');
select ok(journal.open_original('f1000000-0000-0000-0000-000000000001') like '%/poem.pdf',
  'Once accepted, the Editor-in-Chief opens the original, and it is kept');

select * from finish();
rollback;
