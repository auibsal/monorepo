-- The design review, PR 4d (Nov 4, 2026): saved reading (A9, C22) and a
-- record's history (C24).
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
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'adopted', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

select plan(13);

select pg_temp.make_user('00000000-0000-0000-0000-0000000d4001', 'reader.d4@auib.edu.iq', 'Reader');
select pg_temp.make_user('00000000-0000-0000-0000-0000000d4002', 'other.d4@auib.edu.iq', 'Other Reader');
select pg_temp.make_user('00000000-0000-0000-0000-0000000d4003', 'editor.d4@auib.edu.iq', 'Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000d4004', 'events.d4@auib.edu.iq', 'Events Lead');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000d4003', 'eic');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000d4004', 'events_lead');

select pg_temp.make_user('00000000-0000-0000-0000-0000000d4005', 'writer.d4@auib.edu.iq', 'D4 Writer');
insert into journal.contributors (id, slug, name_en, name_ar, user_id) values
  ('c0000000-0000-0000-0000-0000000d4c01', 'd4-writer', 'D4 Writer', 'كاتب',
   '00000000-0000-0000-0000-0000000d4005');
insert into journal.pieces (id, slug, category, language, title_en, title_ar, status, published_at, contributor_id) values
  ('d0000000-0000-0000-0000-0000000d4d01', 'd4-published', 'poetry', 'en', 'Published', 'منشور', 'published',
   now() - interval '1 day', 'c0000000-0000-0000-0000-0000000d4c01'),
  ('d0000000-0000-0000-0000-0000000d4d02', 'd4-draft', 'poetry', 'en', 'Draft', 'مسودة', 'editing',
   null, 'c0000000-0000-0000-0000-0000000d4c01');
update journal.pieces set title_en = 'Published, retitled'
  where id = 'd0000000-0000-0000-0000-0000000d4d01';

-- A9: saving to read later.
select pg_temp.login_as('00000000-0000-0000-0000-0000000d4001');
select lives_ok(
  $$ insert into journal.saved_pieces (piece_id) values ('d0000000-0000-0000-0000-0000000d4d01') $$,
  'a reader saves a published piece'
);
select is(
  (select count(*)::int from journal.saved_pieces),
  1,
  'and sees it in their list'
);
select throws_ok(
  $$ insert into journal.saved_pieces (piece_id) values ('d0000000-0000-0000-0000-0000000d4d02') $$,
  '42501', null,
  'a piece that is not published cannot be saved'
);
select throws_ok(
  $$ insert into journal.saved_pieces (user_id, piece_id)
     values ('00000000-0000-0000-0000-0000000d4002', 'd0000000-0000-0000-0000-0000000d4d01') $$,
  '42501', null,
  'nobody saves for someone else'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000d4002');
select is(
  (select count(*)::int from journal.saved_pieces),
  0,
  'another reader does not see that list'
);
delete from journal.saved_pieces;

select pg_temp.login_as('00000000-0000-0000-0000-0000000d4001');
delete from journal.saved_pieces where piece_id = 'd0000000-0000-0000-0000-0000000d4d01';
select is(
  (select count(*)::int from journal.saved_pieces),
  0,
  'a reader lets go of what they saved (and only they can)'
);

-- C24: a record's history, for officers who can see the record.
select is(
  (select count(*)::int from core.record_history('journal.pieces', 'd0000000-0000-0000-0000-0000000d4d01')),
  0,
  'a member who holds no role reads no history'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000d4003');
select ok(
  (select count(*) from core.record_history('journal.pieces', 'd0000000-0000-0000-0000-0000000d4d01')) >= 2,
  'an officer who can see the piece reads its history'
);
select ok(
  (select 'title_en' = any (changed) from core.record_history('journal.pieces', 'd0000000-0000-0000-0000-0000000d4d01')
   where operation = 'UPDATE' limit 1),
  'a change names the fields it changed'
);
select is(
  (select count(*)::int from core.record_history('core.profiles', '00000000-0000-0000-0000-0000000d4001')),
  0,
  'only records with their own page in the Diwan have a history here'
);
select is(
  pg_get_function_result('core.record_history(text, text)'::regprocedure),
  'TABLE(operation text, actor_id uuid, occurred_at timestamp with time zone, changed text[])',
  'history never carries the values, only who, what, when and which fields'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000d4004');
select is(
  (select count(*)::int from core.record_history('journal.pieces', 'd0000000-0000-0000-0000-0000000d4d02')),
  0,
  'an officer who cannot see the record reads none of its history'
);
select ok(
  (select count(*) from core.record_history('journal.pieces', 'd0000000-0000-0000-0000-0000000d4d01')) >= 1,
  'but reads the history of a record they can see'
);

select pg_temp.logout();
select * from finish();
rollback;
