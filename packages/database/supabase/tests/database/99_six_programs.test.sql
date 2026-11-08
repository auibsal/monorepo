-- Six programs, no groupings (migration 20261029000100, decisions.md).
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
select plan(12);

select is(
  (select array_agg(slug order by sort) from core.programmes where is_active),
  array['typewriter-tour', 'company'],
  'No series (decisions.md): only the Tour''s row (membership) and the Company stay active'
);
select ok(
  not exists (select 1 from core.programmes where is_active and (rhythm_en is null or rhythm_ar is null)),
  'Each active row shows its rhythm in one line, in both languages'
);
select is(
  (select name_en || ' / ' || name_ar from core.programmes where slug = 'salon'),
  'The Salon / الصالون',
  'The Majlis is the Salon'
);
select is(
  (select summary_en from core.programmes where slug = 'salon'),
  'A guest, three readings, tea and conversation. Once a term, from fall 2027, a debate.',
  'The Salon''s summary'
);
select ok(
  not exists (select 1 from core.programmes
    where slug in ('majlis', 'munazara', 'mutanabbi-friday', 'bad-poetry-night')),
  'Munazara, Mutanabbi Friday and Bad Poetry Night are folded and removed'
);
select ok(
  exists (select 1 from core.programmes where slug = 'next-stop' and not is_active),
  'Next Stop is Qirtas''s video show: its program row is unpublished, not deleted'
);
select hasnt_table('events', 'series_rules', 'No repeat rules: the term calendar is plain events (decisions.md)');
select is(
  (select count(*)::integer from events.events e
    where e.programme_id is null and e.status = 'published'
      and e.slug ~ '^(writing-workshop|reading-with-a-guest|book-discussion|listening-session|founding-meeting)-'
      and (e.starts_at at time zone 'Asia/Baghdad')::time = '16:00'
      and extract(isodow from e.starts_at at time zone 'Asia/Baghdad') = 2),
  0,
  'No Tuesday event is published until its room is confirmed (decisions §7, §10)'
);
select is(
  (select (ends_at at time zone 'Asia/Baghdad')::time from events.events where slug = 'founding-meeting-2027-03-30'),
  '18:00'::time,
  'The Founding Meeting on March 30 runs to 6:00 PM'
);
select is(
  (select count(*)::int from events.events where slug = 'book-circle-2027-04-09'),
  0,
  'The April 9 trip, canceled in Notion, is gone (decisions.md)'
);

select is(
  (select array_agg(e.slug order by e.starts_at) from events.events e
    where e.slug like 'listening-session-%'),
  array['listening-session-2027-03-16', 'listening-session-2027-05-11'],
  'The listening sessions are March 16 and May 11, at their Notion Slugs'
);
select is(
  (select count(*) from core.settings where key = 'journal.award_names_public')::integer,
  0,
  'The Awards'' names are confirmed: no switch is kept'
);

select * from finish();
rollback;
