-- Google Wallet passes: who reads them, and retiring them.
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

select plan(11);

select pg_temp.make_user('00000000-0000-0000-0000-0000000071a1', 'holder@auib.edu.iq', 'Holder');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071a2', 'other@auib.edu.iq', 'Other');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071a3', 'secretary@auib.edu.iq', 'Secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000071a3', 'general_secretary');
-- AUIB accounts are members from sign-up, with a card.

-- The API records the passes it issues (service role).
insert into membership.wallet_passes (code, user_id, state)
select c.code, c.user_id, 'saved' from membership.cards c
where c.user_id in ('00000000-0000-0000-0000-0000000071a1', '00000000-0000-0000-0000-0000000071a2');

select pg_temp.login_as('00000000-0000-0000-0000-0000000071a1');
select is((select count(*)::integer from membership.wallet_passes), 1, 'A member reads only their own pass');
select throws_ok(
  $$ update membership.wallet_passes set state = 'removed' $$,
  '42501', null, 'and cannot change it'
);
select throws_ok(
  $$ insert into membership.wallet_passes (code, user_id) values ('feedface', auth.uid()) $$,
  '42501', null, 'or record one'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000071a3');
select is((select count(*)::integer from membership.wallet_passes where state = 'saved'), 2,
  'Member managers count the passes in Google Wallet');

select pg_temp.login_anon();
select throws_ok($$ select * from membership.wallet_passes $$, '42501', null, 'Visitors read nothing');

-- Resetting the card retires the pass for the old code.
select pg_temp.logout();
create temp table old_code as
  select code from membership.cards where user_id = '00000000-0000-0000-0000-0000000071a1';
select pg_temp.login_as('00000000-0000-0000-0000-0000000071a1');
select lives_ok($$ select membership.reissue_card() $$, 'A member resets their card');
select pg_temp.logout();
select ok(
  exists (select 1 from core.outbox o where o.kind = 'membership.wallet_expire'
    and o.payload->'codes' ? (select code from old_code)),
  'and the old pass is queued to expire'
);

-- The membership ends.
delete from core.outbox where kind = 'membership.wallet_expire';
delete from membership.memberships where user_id = '00000000-0000-0000-0000-0000000071a2';
select ok(
  exists (select 1 from core.outbox o where o.kind = 'membership.wallet_expire'
    and o.payload->'codes' ? (select code from membership.cards where user_id = '00000000-0000-0000-0000-0000000071a2')),
  'An ended membership retires the pass'
);

-- An expired pass is not queued again; a deleted account's pass is.
update membership.wallet_passes set state = 'expired' where user_id = '00000000-0000-0000-0000-0000000071a2';
delete from core.outbox where kind = 'membership.wallet_expire';
select lives_ok($$ select private.expire_wallet_passes('00000000-0000-0000-0000-0000000071a2') $$, 'Retiring again');
select is((select count(*)::integer from core.outbox where kind = 'membership.wallet_expire'), 0,
  'does nothing for an expired pass');

-- A deleted account's pass goes too.
update membership.wallet_passes set state = 'saved' where user_id = '00000000-0000-0000-0000-0000000071a2';
create temp table gone_code as
  select code from membership.cards where user_id = '00000000-0000-0000-0000-0000000071a2';
delete from auth.users where id = '00000000-0000-0000-0000-0000000071a2';
select ok(
  exists (select 1 from core.outbox o where o.kind = 'membership.wallet_expire'
    and o.payload->'codes' ? (select code from gone_code)),
  'A deleted account retires the pass'
);

select * from finish();
rollback;
