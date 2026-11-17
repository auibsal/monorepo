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

select plan(11);

select pg_temp.make_user('a0000000-0000-0000-0000-0000000000c1', 'media.lead@auib.edu.iq', 'Mira Lead');
select pg_temp.grant_role('a0000000-0000-0000-0000-0000000000c1', 'media_director');
select pg_temp.make_user('a0000000-0000-0000-0000-0000000000c2', 'other.person@auib.edu.iq', 'Omar Other');

insert into core.programs (id, slug, kind, name_en, name_ar)
values ('b0000000-0000-0000-0000-0000000000c1', 'next-stop-test', 'series', 'Next Stop', 'المحطة');
insert into programs.episodes (id, program_id, slug, title_en, title_ar, youtube_id, summary_en)
values ('e0000000-0000-0000-0000-0000000000c1', 'b0000000-0000-0000-0000-0000000000c1',
  'first', 'First', 'الأولى', 'dQw4w9WgXcQ', 'The first words.');
insert into core.announcements (id, title_en, title_ar, body_en, body_ar)
values ('c0000000-0000-0000-0000-0000000000c1', 'A notice', 'إعلان', 'Text', 'نص'),
       ('c0000000-0000-0000-0000-0000000000c2', 'Sent notice', 'إعلان مرسل', 'Text', 'نص');
update core.announcements set sent_at = now() where id = 'c0000000-0000-0000-0000-0000000000c2';

select is(
  (select count(*)::int from private.trash_kinds()), 9,
  'Every area with records has Recently deleted'
);

select pg_temp.login_as('a0000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select core.trash_record('announcement', 'c0000000-0000-0000-0000-0000000000c2') $$,
  '23514', 'sent', 'A sent announcement stays'
);
select lives_ok(
  $$ select core.trash_record('announcement', 'c0000000-0000-0000-0000-0000000000c1') $$,
  'An unsent announcement moves to Recently deleted'
);
select is(
  (select count(*)::int from api.announcements where id = 'c0000000-0000-0000-0000-0000000000c1'),
  0, 'And is hidden from every read'
);
select lives_ok(
  $$ select core.restore_record('announcement', 'c0000000-0000-0000-0000-0000000000c1') $$,
  'Restore brings it back'
);

update api.episodes set summary_en = 'Better words.' where id = 'e0000000-0000-0000-0000-0000000000c1';
select is(
  (select fields->>'summary_en' from api.record_versions
   where record_table = 'programs.episodes' and record_id = 'e0000000-0000-0000-0000-0000000000c1'),
  'The first words.', 'Saving a description keeps the words it replaced'
);
update api.episodes set title_en = 'First, again' where id = 'e0000000-0000-0000-0000-0000000000c1';
select is(
  (select count(*)::int from api.record_versions where record_id = 'e0000000-0000-0000-0000-0000000000c1'),
  1, 'A save that leaves the text alone keeps no version'
);
update api.episodes set summary_en = (
  select fields->>'summary_en' from api.record_versions
  where record_id = 'e0000000-0000-0000-0000-0000000000c1' order by id desc limit 1)
where id = 'e0000000-0000-0000-0000-0000000000c1';
select is(
  (select summary_en from api.episodes where id = 'e0000000-0000-0000-0000-0000000000c1'),
  'The first words.', 'Restoring an earlier version saves it again'
);

select pg_temp.login_as('a0000000-0000-0000-0000-0000000000c2');
select is(
  (select count(*)::int from api.record_versions), 0,
  'Only those who may edit the record read its versions'
);
select throws_ok(
  $$ select core.trash_record('episode', 'e0000000-0000-0000-0000-0000000000c1') $$,
  '42501', 'not_allowed', 'Only those who may delete it move it to Recently deleted'
);

select pg_temp.logout();
select ok(
  'programs.openings' = any (private.history_tables())
    and 'core.announcements' = any (private.history_tables()),
  'Openings and announcements keep their History'
);

select * from finish();
rollback;
