-- The personal email: asked for, confirmed from a link, and never the same
-- as anyone's sign-in address or another member's personal email.
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

select plan(13);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000e1', 'one@auib.edu.iq', 'One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000e2', 'two@auib.edu.iq', 'Two');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok($$ select core.request_personal_email('one@auib.edu.iq') $$,
  '22023', 'email_auib', 'An AUIB address is not a personal email');
select throws_ok($$ select core.request_personal_email('Two@AUIB.edu.iq') $$,
  '22023', 'email_auib', 'Not even someone else''s');
select throws_ok($$ select core.request_personal_email('not an address') $$,
  '22023', 'email_invalid', 'It must look like an address');
select throws_ok(
  $$ update core.profiles set personal_email = 'x@example.com'
     where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501', null, 'Members no longer write the column directly'
);

select lives_ok($$ select core.request_personal_email(' One@Example.com ') $$,
  'A member asks for a personal email');
select is((select pending_email from core.my_personal_email()), 'one@example.com',
  'It waits, lowercased, for its link');
select pg_temp.logout();
select is((select count(*)::integer from core.outbox where kind = 'personal_email.confirm'), 1,
  'and the link is on its way');

select is(core.confirm_personal_email(
  (select token from core.personal_email_requests where user_id = '00000000-0000-0000-0000-0000000000e1')),
  'confirmed', 'The button behind the link confirms it');
select ok((select personal_email_verified_at is not null from core.profiles
  where id = '00000000-0000-0000-0000-0000000000e1'), 'The address is verified');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok($$ select core.request_personal_email('one@example.com') $$,
  '23505', 'email_in_use', 'Another member cannot use it');
select pg_temp.logout();

select throws_ok(
  $$ insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
     values ('00000000-0000-0000-0000-0000000000e3', 'ONE@example.com', now(), '{}', 'authenticated', 'authenticated') $$,
  '23505', 'email_in_use', 'Nor can a new account sign in with it'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select core.remove_personal_email();
select is((select email from core.my_personal_email()), null, 'A member can remove it');
select pg_temp.logout();

select hasnt_column('core', 'member_details', 'phone', 'Phone numbers are not collected');

select * from finish();
rollback;
