-- Qirtas, one door, and one name per language (owner, Oct 31, 2026):
-- everything members send is read blind through a call (the standing call
-- when none is named), bylines and judges are people from the register or
-- Anonymous, and a member's name is one name in each language.
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

select is((select count(*) from journal.calls where issue_id is null)::integer, 1,
  'There is one standing call, which belongs to no Edition');
select ok((select desks @> '{news,games,letters}'::journal.desk[] from journal.calls where issue_id is null),
  'and it takes every section');

select pg_temp.make_user('00000000-0000-0000-0000-0000000099a1', 'door@auib.edu.iq', 'Door Writer');
insert into membership.pledges (user_id, pledge_type, version)
select '00000000-0000-0000-0000-0000000099a1', t, '1'
from unnest(enum_range(null::membership.pledge_type)) t;

select pg_temp.login_as('00000000-0000-0000-0000-0000000099a1');
insert into journal.submissions (category, language, title, deck, body_html, human_authorship_confirmed, anonymous)
values ('report', 'en', 'One door story', 'A deck.', '<p>Story</p>', true, true);
select ok((select c.issue_id is null from journal.submissions s join journal.calls c on c.id = s.call_id
  where s.title = 'One door story'), 'News sent without a call goes to the standing call, to be read blind');
select pg_temp.logout();

select ok(exists (select 1 from journal.contributors where is_anonymous), 'Anonymous is a byline');
select throws_ok(
  $$ insert into journal.contributors (slug, name_en) values ('a-desk', 'A Desk') $$,
  '23514', null, 'A new byline is a member or Anonymous, never a name typed in'
);

insert into journal.contributors (slug, name_en, user_id)
values ('door-writer', 'Typed Name', '00000000-0000-0000-0000-0000000099a1');
select is((select name_en from journal.contributors where slug = 'door-writer'), 'Door Writer',
  'A member''s byline takes the name from their profile');
update core.profiles set full_name_en = 'Door W. Writer', full_name_ar = 'كاتب الباب'
where id = '00000000-0000-0000-0000-0000000099a1';
select is((select name_ar from journal.contributors where slug = 'door-writer'), 'كاتب الباب',
  'and follows it when the member changes their name');

select is((select full_name_en from core.profiles where id = '00000000-0000-0000-0000-0000000099a1'),
  'Door W. Writer', 'A name is one name in each language');
select hasnt_column('core', 'profiles', 'given_name_en', 'The first and last name parts are gone');

select throws_ok(
  $$ insert into events.events (slug, title_en, title_ar, starts_at, ends_at)
     values ('2026-11', 'A month', 'شهر', now(), now() + interval '1 hour') $$,
  '23514', null, 'No event takes a slug that reads as a month (/events/2026-11 is a month)'
);

select * from finish();
rollback;
