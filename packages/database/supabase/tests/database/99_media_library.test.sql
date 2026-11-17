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
select plan(10);

-- decisions.md, The site: "One media library".
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f2', 'reader@auib.edu.iq', 'Reader');

insert into content.media_items (id, bucket, path, file_name, uploaded_by) values
  ('c0000000-0000-0000-0000-0000000000a1', 'media', 'events/night.jpg', 'night.jpg',
   '00000000-0000-0000-0000-0000000000f1'),
  ('c0000000-0000-0000-0000-0000000000a2', 'media', 'events/night-2.jpg', 'night-2.jpg',
   '00000000-0000-0000-0000-0000000000f1'),
  ('c0000000-0000-0000-0000-0000000000a3', 'media', 'events/spare.jpg', 'spare.jpg',
   '00000000-0000-0000-0000-0000000000f1');
insert into events.events (id, slug, title_en, title_ar, starts_at, status, image_path) values
  ('e0000000-0000-0000-0000-0000000000c1', 'poetry-night-2026-12-01', 'Poetry night', 'أمسية شعر',
    now() + interval '10 days', 'draft', 'events/night.jpg');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f2');
select is((select count(*)::int from api.media_items), 0,
  'Someone holding no role does not see the library');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select is((select count(*)::int from api.media_items), 3, 'Staff see the library');
select is(
  (select array_agg(kind) from core.media_uses('c0000000-0000-0000-0000-0000000000a1')),
  array['event'], 'An item names the record that uses it'
);
select throws_ok(
  $$ select core.trash_record('media', 'c0000000-0000-0000-0000-0000000000a1') $$,
  '23514', 'in_use', 'An item in use is not deleted'
);
select is(
  (select array_agg(u order by u) from core.unused_media() u),
  array['c0000000-0000-0000-0000-0000000000a2'::uuid, 'c0000000-0000-0000-0000-0000000000a3'::uuid],
  'Unused items are listed for the yearly audit'
);
select lives_ok(
  $$ select core.replace_media('c0000000-0000-0000-0000-0000000000a1', 'events/night-2.jpg') $$,
  'Replacing a file'
);
select is(
  (select image_path from events.events where id = 'e0000000-0000-0000-0000-0000000000c1'),
  'events/night-2.jpg', 'keeps every use, on the new file'
);
select lives_ok(
  $$ select core.trash_record('media', 'c0000000-0000-0000-0000-0000000000a3') $$,
  'An unused item moves to Recently deleted'
);
select is(
  (select count(*)::int from core.recently_deleted('media')), 1,
  'It waits in the library''s Recently deleted'
);
select pg_temp.logout();
update content.media_items set deleted_at = now() - interval '31 days'
where id = 'c0000000-0000-0000-0000-0000000000a3';
select is(
  (select count(*)::int from core.retention_due() where kind = 'media_file'), 1,
  'After 30 days its file is due for removal'
);

select * from finish();
rollback;
