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

-- "From the Society" (decisions.md, Qirtas): Media writes notices and posts
-- them to the stream with a date and no email; the President's email puts a
-- notice there too. Haven is the pilot issue, with its dates.

select plan(13);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f5101', 'member@auib.edu.iq', 'Plain Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f5102', 'media@auib.edu.iq', 'Media Director');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f5102', 'media_director');

delete from core.outbox where kind = 'announcement.broadcast';

select pg_temp.login_as('00000000-0000-0000-0000-0000000f5102');
create temp table notice as
  select core.save_announcement('auibsal.org is open', 'الموقع مفتوح', 'Open.', 'مفتوح.') as id;
grant select on notice to authenticated, anon;
select ok((select id from notice) is not null, 'Media writes a notice');
select throws_ok($$ select core.send_announcement((select id from notice)) $$, '42501', null,
  'but only the President emails it');
select throws_ok($$ select core.post_notice((select id from notice), now() + interval '1 day') $$, '22023', null,
  'A notice is posted today or with an earlier date');
select lives_ok($$ select core.post_notice((select id from notice), timestamptz '2026-11-08 12:00+03') $$,
  'Media posts it to From the Society, dated Nov 8');

select pg_temp.login_anon();
select is((select title_en from core.society_notices(5)), 'auibsal.org is open',
  'Visitors see it in the stream');
select is((select shown_at from core.society_notices(5)), timestamptz '2026-11-08 12:00+03',
  'with the date it carries');
select pg_temp.logout();
select is((select count(*)::integer from core.outbox where kind = 'announcement.broadcast'), 0,
  'and no email goes out');
select ok(exists (select 1 from core.outbox where kind = 'revalidate' and payload = '{"tags": ["journal"]}'),
  'Qirtas''s front page is refreshed');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f5101');
select throws_ok($$ select core.post_notice((select id from notice), null) $$, '42501', null,
  'A member can''t post or take down a notice');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5102');
select lives_ok($$ select core.post_notice((select id from notice), null) $$, 'Media takes it out');
select pg_temp.login_anon();
select is((select count(*)::integer from core.society_notices(5) where title_en = 'auibsal.org is open'), 0,
  'and it leaves the stream');
select pg_temp.logout();

-- ── Haven, the pilot issue ──────────────────────────────────────────────────

select is((select number from journal.issues where slug = 'haven'), null,
  'Haven, the pilot issue, carries no number');
select ok((select c.closes_at = timestamptz '2026-12-06 23:59:59+03' and c.max_per_person = 2
  from journal.calls c join journal.issues i on i.id = c.issue_id where i.slug = 'haven'),
  'Its call closes Sun Dec 6 at 11:59 p.m. Baghdad time, two entries each');

select * from finish();
rollback;
