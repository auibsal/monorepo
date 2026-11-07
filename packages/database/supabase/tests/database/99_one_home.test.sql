-- One home per thing (decisions §8, §10): events and minutes come from
-- Notion, access comes from the access type alone, and voting rights count
-- check-ins only.
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
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'adopted', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

select plan(11);

select pg_temp.make_user('00000000-0000-0000-0000-00000001a001', 'director.oh@auib.edu.iq', 'Director');
select pg_temp.make_user('00000000-0000-0000-0000-00000001a002', 'secretary.oh@auib.edu.iq', 'Secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-00000001a001', 'events_director');
select pg_temp.grant_role('00000000-0000-0000-0000-00000001a002', 'general_secretary');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry) values
  ('00000000-0000-0000-0000-00000001a101', 'oh-members', 'Members', 'الأعضاء', now() + interval '2 days', 'published', 'members'),
  ('00000000-0000-0000-0000-00000001a102', 'oh-open', 'Open', 'مفتوح', now() + interval '3 days', 'published', 'open');

select ok(
  (select members_only and rsvp_enabled from events.events where id = '00000000-0000-0000-0000-00000001a101'),
  'A Members event is members-only and takes bookings'
);
select ok(
  (select not members_only from events.events where id = '00000000-0000-0000-0000-00000001a102'),
  'An Open event is public'
);
select throws_ok(
  $$ update events.events set members_only = true where id = '00000000-0000-0000-0000-00000001a102' $$,
  '428C9', null,
  'members_only is derived from the access type and never written'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000001a001');
select throws_ok(
  $$ insert into events.events (slug, title_en, title_ar, starts_at) values ('oh-new', 'New', 'جديد', now() + interval '5 days') $$,
  '42501', null,
  'Nobody makes an event in the Diwan: events come from Notion'
);
select is_empty(
  $$ delete from events.events where id = '00000000-0000-0000-0000-00000001a102' returning id $$,
  'Nor deletes one'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000001a002');
select throws_ok(
  $$ insert into governance.minutes (title_en, text_en, meeting_on, body) values ('Minutes', '<p>x</p>', current_date, 'council') $$,
  '42501', null,
  'Minutes come from Notion, not the Diwan'
);

select pg_temp.logout();
select throws_ok(
  $$ insert into membership.activity_records (user_id, kind, note) values ('00000000-0000-0000-0000-00000001a001', 'manual', 'A reading') $$,
  '23514', null,
  'Only check-ins count toward voting'
);
select hasnt_function('membership', 'add_manual_activity', 'Nobody records activity by hand');
select has_column('events', 'events', 'entry', 'The access type is the one source');
select is_empty($$ select id from storage.buckets where id = 'receipts' $$, 'No receipts bucket: charity collections are a Notion record');

-- A partner's team is its Lead and up to two more (decisions §2).
select pg_temp.make_user('00000000-0000-0000-0000-00000001a201', 'lead.oh@club.org', 'Lead');
select pg_temp.make_user('00000000-0000-0000-0000-00000001a202', 'two.oh@club.org', 'Two');
select pg_temp.make_user('00000000-0000-0000-0000-00000001a203', 'three.oh@club.org', 'Three');
select pg_temp.make_user('00000000-0000-0000-0000-00000001a204', 'four.oh@club.org', 'Four');
insert into governance.partners (id, slug, name_en, kind, status)
values ('00000000-0000-0000-0000-00000001a301', 'oh-club', 'OH Club', 'club', 'active');
insert into access.role_assignments (user_id, role, scope_type, scope_id) values
  ('00000000-0000-0000-0000-00000001a201', 'partner_lead', 'partner', '00000000-0000-0000-0000-00000001a301'),
  ('00000000-0000-0000-0000-00000001a202', 'partner_rep', 'partner', '00000000-0000-0000-0000-00000001a301'),
  ('00000000-0000-0000-0000-00000001a203', 'partner_rep', 'partner', '00000000-0000-0000-0000-00000001a301');
insert into governance.partner_invitations (partner_id, kind, email, code)
values ('00000000-0000-0000-0000-00000001a301', 'team', 'four.oh@club.org', 'oh-team-four');
select pg_temp.login_as('00000000-0000-0000-0000-00000001a204');
select throws_ok(
  $$ select governance.accept_partner_invitation('oh-team-four') $$,
  '22023', 'team_full',
  'A fourth person does not join a partner''s team'
);

select * from finish();
rollback;
