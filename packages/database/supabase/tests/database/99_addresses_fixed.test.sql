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
select plan(6);

-- decisions.md, The site: addresses are generated, readable and permanent.
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, published_at) values
  ('e0000000-0000-0000-0000-0000000000a1', 'reading-night-2026-12-01', 'Reading night', 'ليلة القراءة',
    now() + interval '10 days', 'published', now()),
  ('e0000000-0000-0000-0000-0000000000a2', 'draft-night-2026-12-02', 'Draft night', 'ليلة مسودة',
    now() + interval '11 days', 'draft', null);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select throws_ok(
  $$ update events.events set slug = 'another-night-2026-12-01' where id = 'e0000000-0000-0000-0000-0000000000a1' $$,
  '23514', 'address_fixed',
  'A published event keeps its address'
);
select lives_ok(
  $$ update events.events set slug = 'drafted-night-2026-12-02' where id = 'e0000000-0000-0000-0000-0000000000a2' $$,
  'A draft''s address follows its title'
);
select pg_temp.logout();
select lives_ok(
  $$ update events.events set slug = 'reading-night-moved-2026-12-01' where id = 'e0000000-0000-0000-0000-0000000000a1' $$,
  'The server''s own key may move an address, with its redirect in the code'
);

-- An address carries no date; a repeated title is numbered.
insert into events.events (id, slug, title_en, title_ar, starts_at) values
  ('e0000000-0000-0000-0000-0000000000b1', 'open-mic-2027-01-05', 'Open mic', 'أمسية مفتوحة', now() + interval '20 days'),
  ('e0000000-0000-0000-0000-0000000000b2', 'open-mic-2027-02-05', 'Open mic', 'أمسية مفتوحة', now() + interval '50 days');
select is(
  (select slug from events.events where id = 'e0000000-0000-0000-0000-0000000000b1'),
  'open-mic',
  'An event''s address drops its date'
);
select is(
  (select slug from events.events where id = 'e0000000-0000-0000-0000-0000000000b2'),
  'open-mic-2',
  'A repeated title takes the next number'
);
update events.events set slug = 'open-mic' where id = 'e0000000-0000-0000-0000-0000000000b2';
select is(
  (select slug from events.events where id = 'e0000000-0000-0000-0000-0000000000b2'),
  'open-mic-2',
  'Saving a draft again keeps its number'
);

select * from finish();
rollback;
