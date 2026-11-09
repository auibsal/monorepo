-- Sponsors in kind (decisions §2, §3): a need given by a partner, and the
-- "Supported by" line on the event's public page.
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

select plan(7);

insert into governance.partners (id, slug, name_en, name_ar, kind, is_listed, status) values
  ('00000000-0000-0000-0000-00000005d001', 'books-sp', 'The Bookshop', 'المكتبة', 'business', true, 'active'),
  ('00000000-0000-0000-0000-00000005d002', 'quiet-sp', 'Quiet Partner', 'شريك', 'business', false, 'active');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry) values
  ('00000000-0000-0000-0000-00000005e001', 'reading-sp', 'A Reading', 'قراءة', now() + interval '10 days', 'published', 'open'),
  ('00000000-0000-0000-0000-00000005e002', 'draft-sp', 'A Draft', 'مسودة', now() + interval '10 days', 'draft', 'open');

select throws_ok(
  $$ insert into programmes.needs (event_id, item, quantity, needed_by, purpose, status, given_by)
     values ('00000000-0000-0000-0000-00000005e001', 'Chairs', 20, current_date + 5, 'Seating', 'listed',
       '00000000-0000-0000-0000-00000005d001') $$,
  '23514', null, 'A need is given by a partner only once it is provided');

insert into programmes.needs (event_id, item, quantity, needed_by, purpose, status, given_by) values
  ('00000000-0000-0000-0000-00000005e001', 'Books', 30, current_date + 5, 'Prizes', 'provided', '00000000-0000-0000-0000-00000005d001'),
  ('00000000-0000-0000-0000-00000005e001', 'Tea', 1, current_date + 5, 'Refreshments', 'partly_provided', '00000000-0000-0000-0000-00000005d001'),
  ('00000000-0000-0000-0000-00000005e001', 'Room', 1, current_date + 5, 'Venue', 'provided', '00000000-0000-0000-0000-00000005d002'),
  ('00000000-0000-0000-0000-00000005e002', 'Pens', 10, current_date + 5, 'Writing', 'provided', '00000000-0000-0000-0000-00000005d001');

select pg_temp.login_anon();
select is((select count(*)::int from events.event_sponsors('reading-sp')), 1,
  'The public sees each listed sponsor of a published event once');
select is((select name_en from events.event_sponsors('reading-sp')), 'The Bookshop',
  'by name');
select is((select count(*)::int from events.event_sponsors('draft-sp')), 0,
  'and nothing for an event that is not published');
select throws_ok($$ select count(*) from programmes.needs $$, '42501', null,
  'The needs themselves stay private');

select pg_temp.logout();
update governance.partners set is_listed = false where id = '00000000-0000-0000-0000-00000005d001';
select pg_temp.login_anon();
select is((select count(*)::int from events.event_sponsors('reading-sp')), 0,
  'A partner that leaves the listing is no longer thanked publicly');

select pg_temp.logout();
select has_index('programmes', 'needs', 'needs_given_by_idx', 'The sponsor link is indexed');

select * from finish();
rollback;
