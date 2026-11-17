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
select plan(9);

-- decisions.md, The site: "Presets".
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f2', 'reader@auib.edu.iq', 'Reader');

select is((select count(*)::int from core.presets where kind = 'event'), 9,
  'Each of the Events Manual''s nine formats is a preset');

insert into events.events (id, slug, title_en, title_ar, starts_at, status) values
  ('e0000000-0000-0000-0000-0000000000d1', 'writing-workshop-2026-12-08', 'Writing workshop', 'ورشة كتابة',
    now() + interval '20 days', 'draft');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select lives_ok(
  $$ select events.apply_event_preset('e0000000-0000-0000-0000-0000000000d1', 'writing-workshop') $$,
  'A new event starts from its format'
);
select is(
  (select extract(epoch from ends_at - starts_at)::int / 60 from api.events
   where id = 'e0000000-0000-0000-0000-0000000000d1'),
  90, 'The preset fills the length'
);
select is(
  (select jsonb_array_length(run_of_show) from api.events
   where id = 'e0000000-0000-0000-0000-0000000000d1'),
  6, 'and the run of show'
);
select ok(
  (select count(*) from api.checklist_items
   where event_id = 'e0000000-0000-0000-0000-0000000000d1' and source = 'access') > 0
  and (select count(*) from api.checklist_items
   where event_id = 'e0000000-0000-0000-0000-0000000000d1' and source = 'green') > 0,
  'Every event''s checklist carries the accessible-event and green-event items'
);

select is(
  (select count(*)::int - count(distinct (source, label_en))::int from api.checklist_items
   where event_id = 'e0000000-0000-0000-0000-0000000000d1'),
  0, 'Starting from a preset adds no second copy of them'
);
select pg_temp.logout();
insert into events.events (id, slug, title_en, title_ar, starts_at, status) values
  ('e0000000-0000-0000-0000-0000000000d2', 'open-mic-2026-12-10', 'Open mic', 'أمسية مفتوحة',
    now() + interval '22 days', 'draft');
select ok(
  (select count(*) from events.checklist_items
   where event_id = 'e0000000-0000-0000-0000-0000000000d2' and source = 'access') > 0,
  'An event made without a preset carries them too'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f2');
select is((select count(*)::int from api.presets), 0,
  'Someone holding no role does not read the presets');
update api.presets set title_en = 'Mine' where key = 'debate';
select pg_temp.logout();
select is((select title_en from core.presets where key = 'debate'), 'A debate',
  'Nor changes them');

select * from finish();
rollback;
