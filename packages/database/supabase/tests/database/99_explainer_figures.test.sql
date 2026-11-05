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
-- </preamble>

select plan(8);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e9001', 'editor.e9@auib.edu.iq', 'Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e9002', 'member.e9@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e9001', 'news_editor');

insert into journal.contributors (id, slug, name_en, name_ar, user_id) values
  ('c0000000-0000-0000-0000-0000000e9c01', 'e9-writer', 'E9 Writer', 'كاتب',
   '00000000-0000-0000-0000-0000000e9002');
insert into journal.pieces (id, slug, category, language, title_en, title_ar, status, published_at, contributor_id, members_only) values
  ('d0000000-0000-0000-0000-0000000e9d01', 'e9-explainer', 'explainer', 'en', 'An Explainer', 'شرح',
   'published', now() - interval '1 day', 'c0000000-0000-0000-0000-0000000e9c01', false),
  ('d0000000-0000-0000-0000-0000000e9d02', 'e9-members', 'explainer', 'en', 'For Members', 'للأعضاء',
   'published', now() - interval '1 day', 'c0000000-0000-0000-0000-0000000e9c01', true),
  ('d0000000-0000-0000-0000-0000000e9d03', 'e9-poem', 'poetry', 'en', 'A Poem', 'قصيدة',
   'published', now() - interval '1 day', 'c0000000-0000-0000-0000-0000000e9c01', false);

select pg_temp.login_as('00000000-0000-0000-0000-0000000e9001');
select lives_ok(
  $$ insert into journal.piece_figures (piece_id, title_en, rows) values
     ('d0000000-0000-0000-0000-0000000e9d01', 'Books collected',
      '[{"label_en": "Fall", "value": 120}, {"label_en": "Spring", "value": 80}]'),
     ('d0000000-0000-0000-0000-0000000e9d02', 'Members only',
      '[{"label_en": "One", "value": 1}]') $$,
  'a piece''s editor adds figures');
select throws_ok(
  $$ insert into journal.piece_figures (piece_id, sort, title_en, rows) values
     ('d0000000-0000-0000-0000-0000000e9d01', 2, 'No number', '[{"label_en": "Fall", "value": "many"}]') $$,
  '22023', 'figure_rows', 'every row is a number');
select throws_ok(
  $$ insert into journal.piece_figures (piece_id, sort, title_en, rows) values
     ('d0000000-0000-0000-0000-0000000e9d01', 3, 'Empty', '[]') $$,
  '23514', null, 'a figure has rows');
select throws_ok(
  $$ insert into journal.piece_figures (piece_id, title_en, rows) values
     ('d0000000-0000-0000-0000-0000000e9d03', 'Not mine', '[{"label_en": "x", "value": 1}]') $$,
  '42501', null, 'but not on another section''s piece');

select pg_temp.login_anon();
select is((select count(*)::int from journal.piece_figures where piece_id::text like 'd0000000-0000-0000-0000-0000000e9d%'), 1,
  'a visitor reads a public piece''s figures, not a members-only one''s');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e9002');
select is((select count(*)::int from journal.piece_figures where piece_id::text like 'd0000000-0000-0000-0000-0000000e9d%'), 2,
  'a member reads both');
select throws_ok(
  $$ insert into journal.piece_figures (piece_id, sort, title_en, rows) values
     ('d0000000-0000-0000-0000-0000000e9d01', 5, 'Mine', '[{"label_en": "x", "value": 1}]') $$,
  '42501', null, 'a member does not add figures');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e9001');
delete from journal.piece_figures where piece_id = 'd0000000-0000-0000-0000-0000000e9d02';
select pg_temp.logout();
select is((select count(*)::int from journal.piece_figures where piece_id::text like 'd0000000-0000-0000-0000-0000000e9d%'), 1, 'the editor removes a figure');

select * from finish();
rollback;
