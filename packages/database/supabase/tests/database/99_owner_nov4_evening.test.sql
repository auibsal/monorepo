-- The owner's Notion follow-up (Nov 4, 2026, evening): the program
-- permission is programs.manage everywhere; Qirtas Arabic editions link;
-- there are no ads and memoranda grant no advertising; the retired names
-- (the Prizes, the Callboard) are gone from the database's own names.
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

select plan(10);

select ok(
  exists (select 1 from access.permissions where key = 'programs.manage'),
  'programs.manage is a permission'
);

select ok(
  not exists (select 1 from access.permissions where key = 'programmes.manage'),
  'programmes.manage is gone'
);

select ok(
  not exists (
    select 1 from pg_policies
    where coalesce(qual, '') || coalesce(with_check, '') like '%programmes.manage%'
  )
  and not exists (
    select 1 from pg_proc where prosrc like '%programmes.manage%'
  ),
  'no policy or function asks for programmes.manage'
);

select ok(
  exists (
    select 1 from access.role_permissions
    where role = 'president' and permission = 'programs.manage'
  ),
  'the President holds programs.manage (owner, Nov 5, 2026)'
);

select lives_ok(
  $$insert into core.notion_links (kind, record_key, notion_page_id)
    values ('piece_ar', gen_random_uuid()::text, 'aaaaaaaabbbbccccddddeeeeeeeeeeee')$$,
  'a Qirtas Arabic edition can be linked'
);

select ok(
  to_regclass('journal.ads') is null
  and not exists (select 1 from pg_proc where proname = 'current_ads'),
  'no ads table and no ad reader'
);

select ok(
  not exists (
    select 1 from pg_constraint
    where conrelid = 'governance.partner_agreements'::regclass
      and pg_get_constraintdef(oid) like '%advertising%'
  ),
  'a memorandum cannot grant or ask for advertising'
);

select ok(
  to_regclass('journal.awards') is not null
  and to_regclass('journal.award_rounds') is not null
  and to_regclass('journal.award_entries') is not null
  and to_regclass('journal.award_judges') is not null
  and to_regclass('journal.prizes') is null,
  'the Awards'' tables have their names'
);

select ok(
  exists (select 1 from access.permissions where key = 'journal.awards')
  and not exists (select 1 from access.permissions where key = 'journal.prizes'),
  'journal.awards is the permission'
);

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('private', 'journal', 'core', 'access', 'programmes', 'membership')
      and (p.proname ~ 'prize|callboard' or p.prosrc ~ 'prize|callboard')
  )
  and not exists (
    select 1 from pg_policies
    where (policyname || coalesce(qual, '') || coalesce(with_check, '')) ~* 'prize|callboard'
  ),
  'no function or policy keeps a retired name'
);

select * from finish();
rollback;
