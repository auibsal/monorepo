-- Telegram (apps/bot): link codes, acting for a linked member, groups.
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

select plan(28);

select pg_temp.make_user('00000000-0000-0000-0000-0000000007a1', 'tg1@auib.edu.iq', 'Linked Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000007a2', 'tg2@auib.edu.iq', 'Other Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000007a3', 'tg3@auib.edu.iq', 'Tech Admin');
insert into membership.memberships (user_id) values
  ('00000000-0000-0000-0000-0000000007a1'), ('00000000-0000-0000-0000-0000000007a2')
  on conflict do nothing;
select pg_temp.grant_role('00000000-0000-0000-0000-0000000007a3', 'tech_admin');

-- Only this test's events (the Tuesday series is seeded data).
delete from events.events;
insert into events.events (id, slug, title_en, title_ar, starts_at, members_only, capacity, status) values
  ('e0000000-0000-0000-0000-0000000007e1', 'tg-open', 'Open', 'مفتوح', now() + interval '2 days', false, 10, 'published'),
  ('e0000000-0000-0000-0000-0000000007e2', 'tg-members', 'Members', 'الأعضاء', now() + interval '3 days', true, 10, 'published');

-- Codes
select pg_temp.login_anon();
select throws_ok($$ select core.telegram_link_code() $$, '42501', null,
  'Guests cannot ask for a link code');

select pg_temp.login_as('00000000-0000-0000-0000-0000000007a1');
create temp table code_a on commit drop as select core.telegram_link_code() as code;
grant select on code_a to public;
select matches((select code from code_a), '^[0-9a-f]{32}$', 'A member gets a 32-character code');
select throws_ok($$ select * from core.telegram_codes $$, '42501', null,
  'Members cannot read the codes');
select throws_ok($$ select core.telegram_group_code() $$, '42501', null,
  'A member without settings.manage cannot connect a group');
select throws_ok(
  $$ select core.telegram_redeem_link((select code from code_a), 42, 'x') $$,
  '42501', null, 'Members cannot redeem codes themselves');

select pg_temp.login_as('00000000-0000-0000-0000-0000000007a3');
create temp table code_g on commit drop as select core.telegram_group_code() as code;
grant select on code_g to public;
select matches((select code from code_g), '^[0-9a-f]{32}$', 'An officer with settings.manage gets a group code');

-- Redeeming
select pg_temp.as_service();
select is(core.telegram_redeem_link((select code from code_g), 4242, 'wrong'), null,
  'A group code does not link an account');
select is(core.telegram_redeem_link((select code from code_a), 4242, 'linked'),
  '00000000-0000-0000-0000-0000000007a1'::uuid, 'The bot redeems a link code');
select is(core.telegram_redeem_link((select code from code_a), 4343, 'again'), null,
  'A code works once');
select ok(core.telegram_register_group((select code from code_g), -1001, 'SAL'),
  'The bot connects a group with the officer''s code');
select ok(not core.telegram_register_group((select code from code_g), -1002, 'Other'),
  'A group code works once');

-- The member's own link
select pg_temp.login_as('00000000-0000-0000-0000-0000000007a1');
select is((select count(*)::int from core.telegram_accounts), 1, 'The member sees their link');
select lives_ok($$ update core.telegram_accounts set notify = false $$,
  'The member turns Telegram notices off');
select throws_ok($$ update core.telegram_accounts set telegram_id = 1 $$, '42501', null,
  'The member cannot change the linked Telegram id');
select pg_temp.login_as('00000000-0000-0000-0000-0000000007a2');
select is((select count(*)::int from core.telegram_accounts), 0, 'Another member does not see it');
select throws_ok($$ select * from core.telegram_groups $$, '42501', null,
  'Members cannot read the group settings');

-- Acting for the member
select pg_temp.as_service();
select is((core.telegram_whoami(4242) ->> 'member')::boolean, true,
  'whoami knows the linked member');
select is(core.telegram_whoami(9999), null, 'An unknown account is nobody');
select pg_temp.as_service();
select is(jsonb_array_length(core.telegram_events(9999)), 1,
  'An unlinked account sees only public events');
select pg_temp.as_service();
select is(jsonb_array_length(core.telegram_events(4242)), 2,
  'A linked member also sees members-only events');
select pg_temp.as_service();
select is(core.telegram_rsvp(4242, 'e0000000-0000-0000-0000-0000000007e2'), 'confirmed',
  'The member RSVPs through the bot');
select pg_temp.as_service();
select throws_ok($$ select core.telegram_rsvp(9999, 'e0000000-0000-0000-0000-0000000007e1') $$,
  '42501', null, 'An unlinked account cannot RSVP');

-- Linking through Telegram's login (apps/api verifies the id_token)
select pg_temp.login_as('00000000-0000-0000-0000-0000000007a2');
select throws_ok(
  $$ select core.telegram_link_account('00000000-0000-0000-0000-0000000007a2', 5151) $$,
  '42501', null, 'Members cannot link an account themselves');
select pg_temp.as_service();
select lives_ok(
  $$ select core.telegram_link_account('00000000-0000-0000-0000-0000000007a2', 4242, 'moved') $$,
  'apps/api links a verified Telegram account');
select is((select user_id from core.telegram_accounts where telegram_id = 4242),
  '00000000-0000-0000-0000-0000000007a2'::uuid,
  'The Telegram account moves to the member who linked it last');
select is((select count(*)::int from core.telegram_accounts
  where user_id = '00000000-0000-0000-0000-0000000007a1'), 0,
  'The previous member no longer has it');

-- The group posts go through apps/api like the other scheduled jobs.
select pg_temp.logout();
select ok((select command like '%call_api(''/cron/telegram''%' from cron.job
  where jobname = 'sal-telegram-posts'), 'The group posts call apps/api');
select hasnt_function('private', 'call_bot', 'The bot has no caller of its own');

select * from finish();
rollback;
