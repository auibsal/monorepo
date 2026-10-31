-- Site emails (owner, Oct 31, 2026): the API address is set, and the
-- Desk reads how email is flowing without seeing any secret.
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
select plan(4);

select is((select value #>> '{}' from core.settings where key = 'platform.api_url'),
  'https://auibsal.org/api', 'The outbox and the scheduled jobs call the site''s API routes');

select pg_temp.make_user('00000000-0000-0000-0000-0000000088a1', 'plain@auib.edu.iq', 'Plain Member');
select pg_temp.login_as('00000000-0000-0000-0000-0000000088a1');
select throws_ok($$ select * from core.outbox_health() $$, '42501', null,
  'Only whoever keeps the connections reads email health');
select pg_temp.logout();

select pg_temp.make_user('00000000-0000-0000-0000-0000000088a2', 'tech@auib.edu.iq', 'Tech Admin');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000088a2', 'tech_admin');
insert into core.outbox (kind, payload) values ('personal_email.confirm', '{}');
select pg_temp.login_as('00000000-0000-0000-0000-0000000088a2');
select ok((select waiting >= 1 and api_url_set from core.outbox_health()),
  'The Desk sees the waiting email and the address');
select ok((select not outbox_secret_set from core.outbox_health()),
  'and that the Vault secret is missing here, so nothing is sent from a local stack');
select pg_temp.logout();

select * from finish();
rollback;
