-- One Edition, one title, one call.
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

-- One Edition, one title, one call (decisions.md, Qirtas): Haven is
-- Edition 0; an Edition's call is titled by the Edition and can't open
-- without its title; Edition work comes out with its Edition.

select plan(10);

select is((select number from journal.issues where slug = 'haven'), 0, 'Haven is Edition 0');
select is((select c.title_en || ' / ' || c.title_ar from journal.calls c
  join journal.issues i on i.id = c.issue_id where i.slug = 'haven'),
  'Edition 0: Haven / الإصدار 0: ملاذ', 'The call takes its Edition''s title, never typed');
select is((select title_en from journal.issues where slug = 'edition-1'), null,
  'Edition 1''s title waits for approval');
select throws_ok(
  $$ update journal.calls c set is_published = true from journal.issues i
     where i.id = c.issue_id and i.slug = 'edition-1' $$,
  '23514', 'edition_title_required', 'An Edition''s call can''t open without its title');

update journal.issues set title_en = 'Rivers', title_ar = 'أنهار' where slug = 'edition-1';
select is((select c.title_en from journal.calls c join journal.issues i on i.id = c.issue_id
  where i.slug = 'edition-1'), 'Edition 1: Rivers', 'Titling the Edition titles its call');
select lives_ok(
  $$ update journal.calls c set is_published = true from journal.issues i
     where i.id = c.issue_id and i.slug = 'edition-1' $$,
  'With its title, the call can open');
select throws_ok(
  $$ update journal.issues set title_en = null where slug = 'edition-1' $$,
  '23514', 'edition_title_required', 'A published call keeps its Edition''s title');

select throws_ok(
  $$ insert into journal.issues (volume, number, slug, title_en, title_ar) values (9, 9, 'open', 'x', 'x') $$,
  '23514', null, '"open" is Send your work''s address, never an Edition''s');

-- Edition work: a piece accepted from Haven's call.
select pg_temp.make_user('00000000-0000-0000-0000-0000000e0c01', 'edition.work@auib.edu.iq', 'Edition Writer');
insert into journal.submissions (id, author_id, call_id, category, language, title, body_html,
  human_authorship_confirmed, first_publication_confirmed)
select '00000000-0000-0000-0000-0000000e0c02', '00000000-0000-0000-0000-0000000e0c01', c.id,
  'poetry', 'en', 'Edition poem', '<p>Lines</p>', true, true
from journal.calls c join journal.issues i on i.id = c.issue_id where i.slug = 'haven';
insert into journal.agreements (submission_id, version, signer_name, signed_by)
values ('00000000-0000-0000-0000-0000000e0c02', '1', 'Edition Writer', '00000000-0000-0000-0000-0000000e0c01');
insert into journal.contributors (slug, name_en, user_id)
values ('edition-writer', 'Edition Writer', '00000000-0000-0000-0000-0000000e0c01');
insert into journal.pieces (issue_id, contributor_id, submission_id, slug, category, language, title_en)
select i.id, (select id from journal.contributors where slug = 'edition-writer'),
  '00000000-0000-0000-0000-0000000e0c02', 'edition-poem', 'poetry', 'en', 'Edition poem'
from journal.issues i where i.slug = 'haven';

select throws_ok(
  $$ update journal.pieces set status = 'published', published_at = now() where slug = 'edition-poem' $$,
  '23514', 'edition_work_with_its_edition', 'Edition work is never published before its Edition');
select lives_ok(
  $$ update journal.pieces p set status = 'scheduled', publish_at = i.publish_at
     from journal.issues i where i.id = p.issue_id and p.slug = 'edition-poem' $$,
  'It is scheduled for its Edition''s date, with the rest');

select * from finish();
rollback;
