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

-- A meeting's date in one place (decisions.md, Where things live): its
-- event's. A meeting without one is given one; the event moving moves it.
select plan(4);

insert into governance.minutes (id, title_en, text_en, meeting_on, body)
values ('00000000-0000-0000-0000-0000000f7001', 'Council meeting', '<p>Minutes.</p>', date '2090-10-06', 'council');

select isnt(
  (select event_id from governance.minutes where id = '00000000-0000-0000-0000-0000000f7001'),
  null,
  'A meeting without an event is given its event'
);
select is(
  (select (e.starts_at at time zone 'Asia/Baghdad')::date from events.events e
   join governance.minutes m on m.event_id = e.id
   where m.id = '00000000-0000-0000-0000-0000000f7001'),
  date '2090-10-06',
  'on the day it was held'
);

update events.events set starts_at = timestamptz '2090-10-08 18:00+03'
where id = (select event_id from governance.minutes where id = '00000000-0000-0000-0000-0000000f7001');
select is(
  (select meeting_on from governance.minutes where id = '00000000-0000-0000-0000-0000000f7001'),
  date '2090-10-08',
  'Moving the event moves the meeting'
);

update governance.minutes set meeting_on = date '2090-01-01'
where id = '00000000-0000-0000-0000-0000000f7001';
select is(
  (select meeting_on from governance.minutes where id = '00000000-0000-0000-0000-0000000f7001'),
  date '2090-10-08',
  'and nothing else sets it'
);

select * from finish();
rollback;
