-- The design review, PR 4e (Nov 4, 2026): Open Pages prompt cards (A35).
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

select plan(5);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f1001', '1241901@auib.edu.iq', 'Student Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f1002', 'teacher.f1@auib.edu.iq', 'Teacher Writer');
update core.profiles set title_form = 'feminine' where id = '00000000-0000-0000-0000-0000000f1001';
-- Faculty and staff are Associate Members (decisions.md, Members).
update membership.memberships set tier = 'associate' where user_id = '00000000-0000-0000-0000-0000000f1002';

insert into journal.submissions (id, author_id, category, language, title, body_html, human_authorship_confirmed,
  first_publication_confirmed, about_writer, writer_year)
values ('e0000000-0000-0000-0000-0000000f1e01', '00000000-0000-0000-0000-0000000f1001', 'opinion_essay', 'en', 'An op-ed',
  '<p>' || repeat('word ', 700) || '</p>', true, true, 'business', 'third');
insert into journal.submissions (id, author_id, category, language, title, body_html, human_authorship_confirmed,
  first_publication_confirmed, about_writer)
values ('e0000000-0000-0000-0000-0000000f1e02', '00000000-0000-0000-0000-0000000f1002', 'opinion_essay', 'en', 'Another op-ed',
  '<p>' || repeat('word ', 700) || '</p>', true, true, 'teaches history at AUIB');

insert into journal.agreements (submission_id, version, signer_name, signed_by) values
  ('e0000000-0000-0000-0000-0000000f1e01', 'v1', 'Student Writer', '00000000-0000-0000-0000-0000000f1001'),
  ('e0000000-0000-0000-0000-0000000f1e02', 'v1', 'Teacher Writer', '00000000-0000-0000-0000-0000000f1002');

insert into journal.contributors (id, slug, name_en, name_ar, user_id, is_pen_name) values
  ('c0000000-0000-0000-0000-0000000f1c01', 'f1-student', 'Student Writer', 'كاتبة', '00000000-0000-0000-0000-0000000f1001', false),
  ('c0000000-0000-0000-0000-0000000f1c02', 'f1-teacher', 'Teacher Writer', 'كاتب', '00000000-0000-0000-0000-0000000f1002', false),
  ('c0000000-0000-0000-0000-0000000f1c03', 'f1-pen', 'A Pen Name', 'اسم مستعار', '00000000-0000-0000-0000-0000000f1002', true);
insert into journal.pieces (id, slug, category, language, title_en, title_ar, status, published_at, contributor_id, submission_id) values
  ('d0000000-0000-0000-0000-0000000f1d01', 'f1-student-op-ed', 'opinion_essay', 'en', 'An op-ed', 'مقال',
   'published', now() - interval '1 day', 'c0000000-0000-0000-0000-0000000f1c01', 'e0000000-0000-0000-0000-0000000f1e01'),
  ('d0000000-0000-0000-0000-0000000f1d02', 'f1-teacher-op-ed', 'opinion_essay', 'en', 'Another op-ed', 'مقال آخر',
   'published', now() - interval '1 day', 'c0000000-0000-0000-0000-0000000f1c02', 'e0000000-0000-0000-0000-0000000f1e02'),
  ('d0000000-0000-0000-0000-0000000f1d03', 'f1-pen-op-ed', 'opinion_essay', 'en', 'Under a pen name', 'باسم مستعار',
   'published', now() - interval '1 day', 'c0000000-0000-0000-0000-0000000f1c03', 'e0000000-0000-0000-0000-0000000f1e02'),
  ('d0000000-0000-0000-0000-0000000f1d04', 'f1-draft-op-ed', 'opinion_essay', 'en', 'Not yet', 'ليس بعد',
   'published', now() + interval '1 day', 'c0000000-0000-0000-0000-0000000f1c02', 'e0000000-0000-0000-0000-0000000f1e02');

select pg_temp.login_anon();
select results_eq(
  $$ select about_writer, writer_year, student, feminine from journal.op_ed_identity('d0000000-0000-0000-0000-0000000f1d01') $$,
  $$ values ('business'::text, 'third'::text, true, true) $$,
  'a visitor reads a student''s line: what they study, their year and their Arabic form');
select results_eq(
  $$ select about_writer, student from journal.op_ed_identity('d0000000-0000-0000-0000-0000000f1d02') $$,
  $$ values ('teaches history at AUIB'::text, false) $$,
  'anyone else''s line is the one after their name');
select is_empty(
  $$ select * from journal.op_ed_identity('d0000000-0000-0000-0000-0000000f1d03') $$,
  'a pen name shows no line');
select is_empty(
  $$ select * from journal.op_ed_identity('d0000000-0000-0000-0000-0000000f1d04') $$,
  'an op-ed shows nothing before its publication date');
select pg_temp.logout();
select is_empty(
  $$ select * from journal.op_ed_identity('00000000-0000-0000-0000-000000000000') $$,
  'nor does a piece that is not there');

select * from finish();
rollback;
