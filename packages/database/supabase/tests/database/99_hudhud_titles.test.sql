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

select pg_temp.make_user('00000000-0000-0000-0000-0000000ab001', 'pres-hud@auib.edu.iq', 'President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ab002', 'member-hud@auib.edu.iq', 'Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ab003', 'partner-hud@auib.edu.iq', 'Partner');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000ab001', 'president');
insert into membership.memberships (user_id) values
  ('00000000-0000-0000-0000-0000000ab001'), ('00000000-0000-0000-0000-0000000ab002')
on conflict (user_id) do nothing;
insert into core.telegram_accounts (user_id, telegram_id) values
  ('00000000-0000-0000-0000-0000000ab001', 900001),
  ('00000000-0000-0000-0000-0000000ab002', 900002),
  ('00000000-0000-0000-0000-0000000ab003', 900003);
insert into core.telegram_groups (chat_id, title, audience, invite_link) values
  (-100900001, 'Members', 'members', 'https://t.me/+members'),
  (-100900002, 'Diwan', 'staff', 'https://t.me/+diwan');
insert into core.telegram_titles (chat_id, telegram_id, title) values (-100900001, 900001, 'President');

select results_eq(
  $$ select telegram_id, title_en, council from core.telegram_role_titles() order by 1 $$,
  $$ values (900001::bigint, 'President'::text, true) $$,
  'Only linked role holders carry a title, with their seat'
);

select throws_ok(
  $$ insert into core.telegram_groups (chat_id, invite_link) values (-100900003, 'https://example.com/x') $$,
  '23514', null,
  'A join link is a Telegram invite link'
);

-- A member sees the members' group, linked; not the Diwan group.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ab002');
select results_eq(
  $$ select audience, invite_link, linked from core.telegram_join_links() $$,
  $$ values ('members'::text, 'https://t.me/+members'::text, true) $$,
  'A member may join the members'' group'
);
select is(
  (select count(*) from core.telegram_titles), 0::bigint,
  'A member does not read the titles'
);

-- The President sees both groups.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ab001');
select results_eq(
  $$ select audience from core.telegram_join_links() $$,
  $$ values ('members'::text), ('staff'::text) $$,
  'A role holder who is a member may join both groups'
);
select is(
  (select count(*) from core.telegram_titles), 1::bigint,
  'Settings managers read the titles'
);

-- Someone neither a member nor a role holder sees none.
select pg_temp.logout();
delete from membership.memberships where user_id = '00000000-0000-0000-0000-0000000ab003';
select pg_temp.login_as('00000000-0000-0000-0000-0000000ab003');
select is(
  (select count(*) from core.telegram_join_links()), 0::bigint,
  'Someone not a member sees no group'
);

select * from finish();
rollback;
