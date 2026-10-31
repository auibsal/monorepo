-- Names in four parts in each language; the name shown is the first and
-- the fourth, kept by the database; members write the parts, not the name
-- shown.
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

select plan(10);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'lina-names@auib.edu.iq', 'Lina Tamimi');

select is(
  (select first_name_en from core.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  null,
  'A name kept whole has no parts yet'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ update core.profiles set full_name_en = 'Someone Else' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null,
  'A member does not write the name shown directly'
);
select lives_ok(
  $$ update core.profiles set first_name_en = ' Lina ', father_name_en = 'Kareem',
       grandfather_name_en = 'Hasan', last_name_en = 'Al-Tamimi'
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'A member gives the four parts in English'
);
select is(
  (select full_name_en from core.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Lina Al-Tamimi',
  'and the name shown is the first and the fourth, trimmed'
);
select is(
  (select full_name_ar from core.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  null,
  'the Arabic name waits for its parts'
);
update core.profiles set first_name_ar = 'لينا', father_name_ar = 'كريم',
  grandfather_name_ar = 'حسن', last_name_ar = ''
where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select full_name_ar from core.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  null,
  'Three parts are not a name'
);
update core.profiles set last_name_ar = 'التميمي'
where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select full_name_ar from core.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'لينا التميمي',
  'Four are, shown as the first and the fourth'
);

select is(
  (select last_name_ar from core.my_name_parts()),
  'التميمي',
  'A member reads their own parts'
);
select pg_temp.logout();
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'other-names@auib.edu.iq', 'Other');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(
  $$ select father_name_en from core.profiles where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null,
  'Nobody else reads a member''s father''s or grandfather''s name'
);

select pg_temp.logout();
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
values ('00000000-0000-0000-0000-0000000000b1', 'guest-names@example.org', now(),
  '{"first_name_en":"Sara","father_name_en":"Ali","grandfather_name_en":"Omar","last_name_en":"Hadi","first_name_ar":"سارة","father_name_ar":"علي","grandfather_name_ar":"عمر","last_name_ar":"هادي"}',
  'authenticated', 'authenticated');
select is(
  (select full_name_en || ' / ' || full_name_ar from core.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
  'Sara Hadi / سارة هادي',
  'Sign-up keeps the parts and shows the first and the fourth'
);

select * from finish();
rollback;
