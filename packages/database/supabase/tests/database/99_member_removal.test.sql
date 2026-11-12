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

-- Removal from membership (decisions.md, Governance): the Council's
-- two-thirds vote, recorded by one officer and approved by another.

select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e0001', 'pres-rm@auib.edu.iq', 'President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e0002', 'vp-rm@auib.edu.iq', 'Vice President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e0003', 'member-rm@auib.edu.iq', 'Member Three');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e0001', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e0002', 'vice_president');
update core.profiles set verified_at = now() where id = '00000000-0000-0000-0000-0000000e0003';
insert into membership.memberships (user_id, tier) values ('00000000-0000-0000-0000-0000000e0003', 'member')
on conflict (user_id) do nothing;
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e0003', 'web_lead');

-- Two resolutions: one carried 6–1, one 4–3 (short of two thirds).
select pg_temp.council_resolution('00000000-0000-0000-0000-0000000e00a1', 'RES-2026-901');
select pg_temp.council_resolution('00000000-0000-0000-0000-0000000e00a2', 'RES-2026-902');
update governance.resolutions set votes_for = 6, votes_against = 1 where id = '00000000-0000-0000-0000-0000000e00a1';
update governance.resolutions set votes_for = 4, votes_against = 3 where id = '00000000-0000-0000-0000-0000000e00a2';

select is(private.is_member('00000000-0000-0000-0000-0000000e0003'), true, 'A member to begin with');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e0003');
select throws_ok(
  $$ select governance.request_removal('00000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-0000000e00a1', 'x') $$,
  '42501', null, 'A member cannot ask'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000e0001');
select throws_ok(
  $$ select governance.request_removal('00000000-0000-0000-0000-0000000e0003', '00000000-0000-0000-0000-0000000e00a2', 'Conduct') $$,
  '22023', 'removal_needs_two_thirds', 'Short of two thirds, no removal'
);
select lives_ok(
  $$ select governance.request_removal('00000000-0000-0000-0000-0000000e0003', '00000000-0000-0000-0000-0000000e00a1', 'Conduct, after notice and a hearing') $$,
  'The President records the Council''s vote'
);
select throws_ok(
  $$ select governance.decide_action((select id from governance.pending_actions where kind = 'member_removal'), true) $$,
  '42501', 'second_officer_required', 'Not approved by the one who asked'
);
select pg_temp.logout();
select is(private.is_member('00000000-0000-0000-0000-0000000e0003'), true, 'Still a member until approved');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e0002');
select is(governance.decide_action((select id from governance.pending_actions where kind = 'member_removal'), true),
  'approved', 'The Vice President approves');
select pg_temp.logout();
select is(private.is_member('00000000-0000-0000-0000-0000000e0003'), false, 'The member is removed');
select ok(
  exists (select 1 from governance.removals where user_id = '00000000-0000-0000-0000-0000000e0003'
    and resolution_id = '00000000-0000-0000-0000-0000000e00a1'
    and requested_by = '00000000-0000-0000-0000-0000000e0001' and approved_by = '00000000-0000-0000-0000-0000000e0002')
  and not exists (select 1 from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000e0003'
    and (ends_at is null or ends_at > now()))
  and exists (select 1 from core.outbox where kind = 'membership.removed'),
  'Recorded with its vote and both officers; roles ended; the person is told'
);

select * from finish();
rollback;
