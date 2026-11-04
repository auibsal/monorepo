-- Second Chapter's stages and drop-off points (Nov 4, 2026): checked on
-- write, read by anyone on a published campaign, edited by its managers.
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
-- </preamble>

select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000c1', 'lead@auib.edu.iq', 'Campaign Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'member@auib.edu.iq', 'Member');

insert into charity.campaigns (id, slug, title_en, title_ar, status)
values ('ca000000-0000-0000-0000-0000000000c1', 'stages-2026', 'Stages', 'المراحل', 'active');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000c1', 'campaign_lead', 'campaign', 'ca000000-0000-0000-0000-0000000000c1');

select is(
  (select drop_off_points from charity.campaigns where slug = 'stages-2026'),
  '[]'::jsonb,
  'A campaign starts with no drop-off points'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select lives_ok(
  $$ update charity.campaigns set
       boxes_on = '2026-10-29', donations_starts_on = '2026-11-01', donations_ends_on = '2026-11-05',
       fair_starts_on = '2026-11-08', fair_ends_on = '2026-11-11',
       handover_due_on = '2026-11-15', impact_due_on = '2026-12-20',
       drop_off_points = '[{"place_en":"Library","place_ar":"المكتبة","hours_en":"9 AM to 4 PM"}]'
     where slug = 'stages-2026' $$,
  'The campaign lead enters the stages and a drop-off point'
);
select throws_ok(
  $$ update charity.campaigns set drop_off_points = '[{"place_en":"Library"}]' where slug = 'stages-2026' $$,
  '23514', null,
  'A drop-off point needs its place in both languages'
);
select throws_ok(
  $$ update charity.campaigns set drop_off_points = '[{"place_en":"A","place_ar":"ب","phone":"1"}]' where slug = 'stages-2026' $$,
  '23514', null,
  'and holds nothing else'
);
select throws_ok(
  $$ update charity.campaigns set drop_off_points =
       (select jsonb_agg(jsonb_build_object('place_en', 'P' || g, 'place_ar', 'م' || g)) from generate_series(1, 21) g)
     where slug = 'stages-2026' $$,
  '23514', null,
  'Twenty points at most'
);
select throws_ok(
  $$ update charity.campaigns set fair_ends_on = '2026-11-01' where slug = 'stages-2026' $$,
  '23514', null,
  'The fair cannot end before it starts'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
update charity.campaigns set drop_off_points = '[]' where slug = 'stages-2026';
select pg_temp.logout();
select is(
  (select jsonb_array_length(drop_off_points) from charity.campaigns where slug = 'stages-2026'),
  1,
  'A member cannot change the drop-off points'
);

select pg_temp.login_anon();
select is(
  (select drop_off_points -> 0 ->> 'place_en' from charity.campaigns where slug = 'stages-2026'),
  'Library',
  'Anyone reads the drop-off points of a published campaign'
);
select is(
  (select fair_starts_on from charity.campaigns where slug = 'stages-2026'),
  '2026-11-08'::date,
  'and its stages'
);

select * from finish();
rollback;
