-- Hudhud in the staff group: who may join, the morning brief, event summaries.
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

create function pg_temp.as_service()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end;
$$;
grant execute on function pg_temp.as_service() to public;

select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-0000000008a1', 'st1@auib.edu.iq', 'Staff Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000008a2', 'st2@auib.edu.iq', 'Plain Member');
insert into membership.memberships (user_id) values
  ('00000000-0000-0000-0000-0000000008a1'), ('00000000-0000-0000-0000-0000000008a2')
  on conflict do nothing;
select pg_temp.grant_role('00000000-0000-0000-0000-0000000008a1', 'tech_admin');
insert into core.telegram_accounts (user_id, telegram_id) values
  ('00000000-0000-0000-0000-0000000008a1', 801), ('00000000-0000-0000-0000-0000000008a2', 802);

delete from events.events;
insert into events.events (id, slug, title_en, title_ar, starts_at, ends_at, members_only, capacity, status) values
  ('e0000000-0000-0000-0000-0000000008e1', 'st-today', 'Today', 'اليوم', now() + interval '1 minute', now() + interval '2 minutes', true, 10, 'published'),
  ('e0000000-0000-0000-0000-0000000008e2', 'st-past', 'Past', 'مضى', now() - interval '3 hours', now() - interval '30 minutes', false, 10, 'published');
insert into events.rsvps (event_id, user_id, status) values
  ('e0000000-0000-0000-0000-0000000008e2', '00000000-0000-0000-0000-0000000008a1', 'confirmed'),
  ('e0000000-0000-0000-0000-0000000008e2', '00000000-0000-0000-0000-0000000008a2', 'confirmed');
insert into events.check_ins (event_id, user_id, method) values
  ('e0000000-0000-0000-0000-0000000008e2', '00000000-0000-0000-0000-0000000008a1', 'manual');

select pg_temp.login_as('00000000-0000-0000-0000-0000000008a1');
select throws_ok($$ select core.telegram_staff_brief() $$, '42501', null,
  'Officers cannot call the brief themselves: it is the bot''s');
select throws_ok($$ select core.telegram_is_staff(801) $$, '42501', null,
  'nor the staff check');

select pg_temp.as_service();
select ok(core.telegram_is_staff(801), 'A linked officer is staff');
select ok(not core.telegram_is_staff(802), 'a linked member without a role is not');
select ok(not core.telegram_is_staff(803), 'and an unlinked account is not');
select ok(
  (select bool_or(e->>'slug' = 'st-today') from jsonb_array_elements(core.telegram_staff_brief()->'events') e),
  'The brief lists today''s events, members-only ones too'
);
select ok(core.telegram_staff_brief()->'waiting' ? 'partner_applications',
  'and what waits in the Diwan');
select is(
  (select e->>'checked_in' from jsonb_array_elements(core.telegram_event_summaries(now() - interval '1 hour', now())) e where e->>'slug' = 'st-past'),
  '1',
  'The summary counts who came'
);
select is(
  (select e->>'booked' from jsonb_array_elements(core.telegram_event_summaries(now() - interval '1 hour', now())) e where e->>'slug' = 'st-past'),
  '2',
  'and who booked'
);

select * from finish();
rollback;
