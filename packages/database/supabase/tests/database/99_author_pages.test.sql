-- Author pages: name slugs, kind and roles, the member's own page.
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

select pg_temp.make_user('00000000-0000-0000-0000-0000000009a1', 'au1@auib.edu.iq', 'Layla Haddad');
insert into membership.memberships (user_id) values ('00000000-0000-0000-0000-0000000009a1') on conflict do nothing;
select pg_temp.grant_role('00000000-0000-0000-0000-0000000009a1', 'tech_admin');

select pg_temp.login_as('00000000-0000-0000-0000-0000000009a1');
select is(journal.my_author_page(), 'layla-haddad',
  'A member''s own page is at their name with dashes');
select is(journal.my_author_page(), 'layla-haddad', 'and asking again gives the same page');

select pg_temp.login_anon();
select is((select kind from journal.author_card('layla-haddad')), 'member',
  'The page says they are a member, before anything is published');
select ok((select cardinality(roles_en) > 0 from journal.author_card('layla-haddad')),
  'and the roles they hold');

-- A pen name says nothing about the person, and shows only with published work.
select pg_temp.logout();
insert into journal.contributors (slug, user_id, name_en, is_pen_name)
values ('the-night-owl', '00000000-0000-0000-0000-0000000009a1', 'The Night Owl', true);
select pg_temp.login_anon();
select is((select count(*)::int from journal.author_card('the-night-owl')), 0,
  'A pen name without published work has no page');

-- A name change moves the page.
select pg_temp.logout();
update core.profiles set full_name_en = 'Leila Haddad' where id = '00000000-0000-0000-0000-0000000009a1';
select is(
  (select slug from journal.contributors where user_id = '00000000-0000-0000-0000-0000000009a1' and not is_pen_name),
  'leila-haddad',
  'The page follows the name'
);
select is(
  (select slug from journal.contributors where user_id = '00000000-0000-0000-0000-0000000009a1' and is_pen_name),
  'the-night-owl',
  'and a pen name keeps its own'
);

select * from finish();
rollback;
