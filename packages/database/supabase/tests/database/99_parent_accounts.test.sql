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

-- An adopted Council resolution, with its minutes: the Council's vote that
-- approves a partnership (decisions §10).
create function pg_temp.council_resolution(
  id uuid default '00000000-0000-0000-0000-0000000c0001',
  code text default 'R-2026-99'
)
returns uuid
language sql
as $$
  with m as (
    insert into governance.minutes (title_en, text_en, meeting_on, body, status, adopted_on)
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'approved', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

-- Parents (decisions.md, Members): the consent link makes a guest account
-- with the Parent role on the child, which shows the child's consents and
-- withdraws them.

select plan(11);

select pg_temp.make_user('00000000-0000-0000-0000-0000000ca001', 'kid@auib.edu.iq', 'Young Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ca002', 'parent@example.org', 'A Parent');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ca003', 'stranger@example.org', 'A Stranger');
update core.profiles set first_name_en = 'Sama', last_name_en = 'Karim',
  birth_year = extract(year from now())::int - 16, birth_month = 3
where id = '00000000-0000-0000-0000-0000000ca001';

-- The link goes out and the parent signs it.
select private.request_parent_consent('00000000-0000-0000-0000-0000000ca001', 'Parent@Example.org');
insert into governance.form_submissions (id, form_key, data, status, submitted_at, signer_name, signed_at)
values ('00000000-0000-0000-0000-0000000cf046', 'f46', '{}', 'submitted', now(), 'A Parent', now());
update governance.form_links set used_at = now(), submission_id = '00000000-0000-0000-0000-0000000cf046'
where subject_user = '00000000-0000-0000-0000-0000000ca001';

select is((select sent_to from governance.parent_link('00000000-0000-0000-0000-0000000cf046')),
  'parent@example.org', 'The link names the address it went to');
select is(governance.user_by_email('PARENT@example.org'),
  '00000000-0000-0000-0000-0000000ca002'::uuid, 'The parent''s account is found by that address');
select isnt(governance.make_parent('00000000-0000-0000-0000-0000000cf046',
  '00000000-0000-0000-0000-0000000ca002'), null, 'The parent is made');
select is(private.membership_kind('00000000-0000-0000-0000-0000000ca002'), 'guest',
  'On a guest account');
select ok(exists (select 1 from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000ca002'
  and role = 'parent' and scope_type = 'member' and scope_id = '00000000-0000-0000-0000-0000000ca001'
  and ends_at is not null), 'With the Parent role on the child, until the child turns 18');
select is(governance.make_parent('00000000-0000-0000-0000-0000000cf046', '00000000-0000-0000-0000-0000000ca002'),
  (select id from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000ca002' and role = 'parent'),
  'Signing again makes no second role');

select pg_temp.login_as('00000000-0000-0000-0000-0000000ca003');
select is((select count(*)::int from governance.my_children_consents()), 0,
  'Someone else sees no consents');
select throws_ok(
  $$ select governance.parent_withdraw_consent('00000000-0000-0000-0000-0000000cf046') $$,
  '42501', null, 'Nor withdraws one'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000ca002');
select is((select child_name_en from governance.my_children_consents()), 'Sama K.',
  'The parent sees the consent, the child by first name and initial');
select lives_ok($$ select governance.parent_withdraw_consent('00000000-0000-0000-0000-0000000cf046') $$,
  'The parent withdraws it');
select pg_temp.logout();
select is((select parent_consent_at from core.profiles where id = '00000000-0000-0000-0000-0000000ca001'),
  null, 'Without the consent, the child''s limits are back');

select * from finish();
rollback;
