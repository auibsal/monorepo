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

select plan(13);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e6001', 'editor.e6@auib.edu.iq', 'Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e6002', 'member.e6@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e6001', 'letters_editor');

insert into journal.contributors (id, slug, name_en, name_ar, user_id) values
  ('c0000000-0000-0000-0000-0000000e6c01', 'e6-writer', 'E6 Writer', 'كاتب',
   '00000000-0000-0000-0000-0000000e6002');
insert into journal.pieces (id, slug, category, language, title_en, title_ar, status, published_at, contributor_id) values
  ('d0000000-0000-0000-0000-0000000e6d01', 'e6-poem', 'poetry', 'en', 'A Poem', 'قصيدة', 'published',
   now() - interval '1 day', 'c0000000-0000-0000-0000-0000000e6c01'),
  ('d0000000-0000-0000-0000-0000000e6d02', 'e6-reel', 'short_film', 'en', 'A Reel', 'مقطع', 'published',
   now() - interval '1 day', 'c0000000-0000-0000-0000-0000000e6c01'),
  ('d0000000-0000-0000-0000-0000000e6d03', 'e6-essay', 'column', 'en', 'A Column', 'عمود', 'published',
   now() - interval '1 day', 'c0000000-0000-0000-0000-0000000e6c01');

-- A12: the clip.
select fk_ok('journal', 'pieces', 'clip_id', 'journal', 'pieces', 'id', 'a piece may name its clip');
select has_index('journal', 'pieces', 'pieces_clip_id_idx', 'the clip is indexed');
select lives_ok(
  $$ update journal.pieces set clip_id = 'd0000000-0000-0000-0000-0000000e6d02'
     where id = 'd0000000-0000-0000-0000-0000000e6d01' $$,
  'a piece is paired with a Video piece'
);
select throws_ok(
  $$ update journal.pieces set clip_id = 'd0000000-0000-0000-0000-0000000e6d03'
     where id = 'd0000000-0000-0000-0000-0000000e6d01' $$,
  '22023', 'clip_not_video',
  'never with a piece from another section'
);
select throws_ok(
  $$ update journal.pieces set clip_id = id where id = 'd0000000-0000-0000-0000-0000000e6d02' $$,
  '23514', null,
  'nor with itself'
);

-- A11: the reading.
select throws_ok(
  $$ update journal.pieces
     set reading_path = 'd0000000-0000-0000-0000-0000000e6d03/00000000-0000-0000-0000-00000000aaaa.mp3'
     where id = 'd0000000-0000-0000-0000-0000000e6d01' $$,
  '22023', 'reading_not_its_own',
  'a reading lives in its own piece''s folder'
);
select lives_ok(
  $$ update journal.pieces
     set reading_path = 'd0000000-0000-0000-0000-0000000e6d01/00000000-0000-0000-0000-00000000aaaa.mp3'
     where id = 'd0000000-0000-0000-0000-0000000e6d01' $$,
  'a piece carries a reading'
);
select throws_ok(
  $$ update journal.pieces set members_only = true
     where id = 'd0000000-0000-0000-0000-0000000e6d01' $$,
  '22023', 'reading_members_only',
  'a piece with a reading stays public, since readings are'
);
-- Twenty-nine more fill Qirtas's thirty.
insert into journal.pieces (slug, category, language, title_en, title_ar, contributor_id)
select 'e6-filler-' || n, 'poetry', 'en', 'Filler', 'حشو', 'c0000000-0000-0000-0000-0000000e6c01'
from generate_series(1, 29) n;
update journal.pieces set reading_path = id || '/00000000-0000-0000-0000-00000000aaaa.mp3'
where slug like 'e6-filler-%';
select throws_ok(
  $$ update journal.pieces
     set reading_path = 'd0000000-0000-0000-0000-0000000e6d03/00000000-0000-0000-0000-00000000aaaa.mp3'
     where id = 'd0000000-0000-0000-0000-0000000e6d03' $$,
  '53400', 'readings_full',
  'thirty readings at most, for the Free plan''s storage'
);
select is(
  (select file_size_limit from storage.buckets where id = 'readings'), 10485760::bigint,
  'each reading is 10 MB at most'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000e6001');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('readings', 'd0000000-0000-0000-0000-0000000e6d01/00000000-0000-0000-0000-00000000bbbb.mp3') $$,
  'a Qirtas editor records a reading'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000e6002');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('readings', 'd0000000-0000-0000-0000-0000000e6d01/00000000-0000-0000-0000-00000000cccc.mp3') $$,
  '42501', null,
  'a member does not'
);
select pg_temp.logout();
select ok(
  (select public from storage.buckets where id = 'readings'),
  'anyone hears the readings, from the public bucket'
);

select * from finish();
rollback;
