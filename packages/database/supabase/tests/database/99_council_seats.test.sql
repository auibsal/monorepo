-- The Council page (migration 20261030000200): every seat by its full
-- title, with its holder or the officer who covers it; no Treasurer.
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

select plan(8);

select pg_temp.make_user('00000000-0000-0000-0000-00000000c5a1', 'gs-cs@auib.edu.iq', 'General Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-00000000c5a2', 'member-cs@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000c5a1', 'general_secretary');

select pg_temp.login_anon();
select results_eq(
  $$ select title_en, coalesce(holder_en, 'covered by ' || covered_by) from governance.council_seats order by sort $$,
  $$ values
    ('President'::text, 'Shaheen Farjo'::text),
    ('Vice President', 'Fajer Saif Khalid Ezzet'),
    ('General Secretary', 'Yaqoob Ghassan Al-Azzawi'),
    ('Editor of Qirtas', 'Mohammed-Ali Ehsan Ohmaid'),
    ('Director of Programs', 'covered by president'),
    ('Director of Media', 'Ali Hayder'),
    ('Director of Partnerships', 'covered by vice_president'),
    ('Director of Membership', 'covered by general_secretary') $$,
  'Visitors read the seats, their holders and who covers the open ones'
);
select is((select count(*)::integer from governance.council_seats where title_en ilike '%treasurer%'), 0, 'There is no Treasurer');
select is((select count(*)::integer from governance.council_seats where kind = 'officer'), 3, 'Three officers');

select pg_temp.login_as('00000000-0000-0000-0000-00000000c5a2');
select lives_ok(
  $$ update governance.council_seats set holder_en = 'Someone' where key = 'director_of_media' $$,
  'A member''s update changes nothing'
);
select is((select holder_en from governance.council_seats where key = 'director_of_media'), 'Ali Hayder', 'so the holder stays');

select pg_temp.login_as('00000000-0000-0000-0000-00000000c5a1');
select lives_ok(
  $$ update governance.council_seats set holder_en = 'A Director', covered_by = null where key = 'director_of_membership' $$,
  'The General Secretary names a holder'
);
select throws_ok(
  $$ update governance.council_seats set covered_by = 'president' where key = 'director_of_media' $$,
  '23514', null, 'A seat with a holder is not also covered'
);
select throws_ok(
  $$ insert into governance.council_seats (key, kind, title_en, title_ar) values ('treasurer', 'secretary', 'Treasurer', 'أمين الصندوق') $$,
  '23514', null, 'Seats are officers or directors'
);

select * from finish();
rollback;
