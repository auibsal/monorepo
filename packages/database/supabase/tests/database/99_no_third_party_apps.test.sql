-- No third-party apps (owner, Oct 30, 2026): a token issued to an app (it
-- carries a client_id) reaches nothing; the Society's own tokens are unaffected.
-- until the founding year ends; Honorary and Alumni Members never do.
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

select plan(7);

select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('core', 'access', 'membership', 'events', 'journal',
        'charity', 'programmes', 'governance', 'content')
      and not exists (
        select 1 from pg_policy p
        where p.polrelid = c.oid and not p.polpermissive
          and p.polname = 'No third-party apps'
      )
  $$,
  'Every SAL table refuses third-party apps (add the policy to new tables)'
);

select ok(
  exists (
    select 1 from pg_db_role_setting s
    join pg_roles r on r.oid = s.setrole
    where r.rolname = 'authenticator'
      and 'pgrst.db_pre_request=private.gate_request' = any (s.setconfig)
  ),
  'The Data API checks every request with private.gate_request'
);

select hasnt_table('access', 'oauth_clients', 'The app registry is gone');

select pg_temp.make_user('00000000-0000-0000-0000-0000000000e1', 'oauth1@auib.edu.iq');

-- The Society's own pages (no client_id).
select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select is((select count(*)::int from core.profiles where id = '00000000-0000-0000-0000-0000000000e1'), 1,
  'The site reads the member''s profile');
select lives_ok($$ select private.gate_request() $$, 'The site passes the request check');

-- Any app.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1',
  '{"client_id": "00000000-0000-0000-0000-00000000a001"}');
select is((select count(*)::int from core.profiles), 0, 'An app sees nothing');
select throws_ok($$ select private.gate_request() $$, '42501', null,
  'An app is turned away');

select * from finish();
rollback;
