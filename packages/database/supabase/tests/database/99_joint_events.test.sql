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
-- </preamble>

select plan(12);

select pg_temp.make_user('00000000-0000-0000-0000-0000000eb001', 'host.eb@auib.edu.iq', 'Host');
select pg_temp.make_user('00000000-0000-0000-0000-0000000eb002', 'lead@club-eb.org', 'Club Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000eb003', 'other@club-eb2.org', 'Other Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000eb004', 'member.eb@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000eb001', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'salon'));

insert into governance.partners (id, slug, name_en, kind, is_listed, status) values
  ('00000000-0000-0000-0000-0000000ebd01', 'club-eb', 'The Club', 'club', true, 'active'),
  ('00000000-0000-0000-0000-0000000ebd02', 'club-eb2', 'Another Club', 'club', true, 'active');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000eb002', 'partner_lead', 'partner', '00000000-0000-0000-0000-0000000ebd01');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000eb003', 'partner_lead', 'partner', '00000000-0000-0000-0000-0000000ebd02');

insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, status, members_only, entry)
values ('00000000-0000-0000-0000-0000000eb101', 'salon-eb-joint',
  (select id from core.programmes where slug = 'salon'),
  'A Joint Salon', 'صالون مشترك', now() + interval '20 days', 'draft', false, 'open');

select pg_temp.login_as('00000000-0000-0000-0000-0000000eb001');
select lives_ok(
  $$ update events.events set partner_id = '00000000-0000-0000-0000-0000000ebd01'
     where id = '00000000-0000-0000-0000-0000000eb101' $$,
  'the host names the partner');
select lives_ok(
  $$ insert into events.joint_tasks (event_id, side, label) values
     ('00000000-0000-0000-0000-0000000eb101', 'society', 'Book the room'),
     ('00000000-0000-0000-0000-0000000eb101', 'partner', 'Bring the speaker') $$,
  'and writes the checklist for both sides');

select pg_temp.login_as('00000000-0000-0000-0000-0000000eb002');
select is((select count(*)::int from events.my_joint_events()), 1,
  'the partner''s team sees its joint event, a draft still');
select is((select count(*)::int from events.joint_tasks), 2, 'and its checklist');
select lives_ok(
  $$ update events.joint_tasks set done_at = now() where label = 'Bring the speaker' $$,
  'it ticks its own item');
select is((select done_by from events.joint_tasks where label = 'Bring the speaker'),
  '00000000-0000-0000-0000-0000000eb002'::uuid, 'which records who ticked it');
update events.joint_tasks set done_at = now() where label = 'Book the room';
select is((select done_at from events.joint_tasks where label = 'Book the room'), null,
  'but not the Society''s');
select throws_ok(
  $$ insert into events.joint_tasks (event_id, side, label) values
     ('00000000-0000-0000-0000-0000000eb101', 'society', 'For them') $$,
  '42501', null, 'nor adds the Society''s items');
select lives_ok(
  $$ insert into events.joint_tasks (event_id, side, label) values
     ('00000000-0000-0000-0000-0000000eb101', 'partner', 'Print the flyers') $$,
  'it adds its own');
update events.events set partner_id = null where id = '00000000-0000-0000-0000-0000000eb101';
select pg_temp.logout();
select is((select partner_id from events.events where id = '00000000-0000-0000-0000-0000000eb101'),
  '00000000-0000-0000-0000-0000000ebd01'::uuid, 'and cannot change the event');

select pg_temp.login_as('00000000-0000-0000-0000-0000000eb003');
select is((select count(*)::int from events.my_joint_events()) + (select count(*)::int from events.joint_tasks), 0,
  'another partner sees none of it');

select pg_temp.login_as('00000000-0000-0000-0000-0000000eb004');
select is((select count(*)::int from events.joint_tasks), 0, 'nor does a member');

select * from finish();
rollback;
