-- The experience audit (migration 20261101001600): the Awards Coordinator
-- role, and the Society's signature kept by name on a memorandum.
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

select plan(5);

select results_eq(
  $$ select permission from access.role_permissions where role = 'awards_coordinator' order by 1 $$,
  $$ values ('journal.prizes'), ('library.read') $$,
  'The Awards Coordinator runs the Awards'
);
select is(
  (select role from programmes.openings where title_en = 'Awards Coordinator'),
  'awards_coordinator',
  'The masthead seat names its role'
);

select pg_temp.make_user('00000000-0000-0000-0000-00000000e5a1', 'sig-pres@auib.edu.iq', 'Signing President');
update core.profiles set full_name_ar = 'رئيس موقّع'
where id = '00000000-0000-0000-0000-00000000e5a1';
insert into governance.partners (id, slug, name_en, kind, status)
values ('00000000-0000-0000-0000-00000000e5b1', 'signature-test', 'Signature Test', 'other', 'prospect');
insert into governance.partner_agreements (id, partner_id, purpose_en, starts_on, grants)
values ('00000000-0000-0000-0000-00000000e5c1', '00000000-0000-0000-0000-00000000e5b1',
  'Readings together.', current_date, '{}');

select is(
  (select society_signatory from governance.partner_agreements
   where id = '00000000-0000-0000-0000-00000000e5c1'),
  null,
  'Unsigned, the Society side names no one'
);
update governance.partner_agreements
set signed_by = '00000000-0000-0000-0000-00000000e5a1', signed_at = now()
where id = '00000000-0000-0000-0000-00000000e5c1';
select is(
  (select society_signatory from governance.partner_agreements
   where id = '00000000-0000-0000-0000-00000000e5c1'),
  'Signing President · رئيس موقّع',
  'Signing records the signer by name, in both languages'
);
select hasnt_function(
  'public', 'society_signs_by_name', 'The trigger body is not exposed'
);

select * from finish();
rollback;
