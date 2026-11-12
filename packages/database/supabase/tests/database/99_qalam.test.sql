-- Qalam's roster (decisions.md; migration 20261107000700): staff
-- only, never members; the retention job deletes it after three years.
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

select plan(29);

-- Qalam's students are accounts (decisions.md, Qirtas: Qalam's shape; the
-- fifth prompt, 3 and 4): the parent's consent (F-38) makes the student's
-- guest account with the Qalam student role, and the roster lists them.

select pg_temp.make_user('00000000-0000-0000-0000-0000000f1a01', 'qalam-lead@auib.edu.iq', 'Qalam Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f1a02', 'qalam-member@auib.edu.iq', 'Qalam Member');
insert into membership.memberships (user_id) values ('00000000-0000-0000-0000-0000000f1a02') on conflict do nothing;
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f1a01', 'qalam_lead');

-- A sample student, as the API route makes the account from F-38: the
-- name on the consent is the account's own.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
values ('00000000-0000-0000-0000-0000000f1a03', 'sara@school.example', now(),
  '{"first_name_en": "Sara", "last_name_en": "Ahmed", "guest": true}', 'authenticated', 'authenticated');
update core.profiles set first_name_ar = 'سارة', last_name_ar = 'أحمد', full_name_ar = 'سارة أحمد'
where id = '00000000-0000-0000-0000-0000000f1a03';

-- The parent, made a guest's account from the address the link went to.
select pg_temp.make_user('00000000-0000-0000-0000-0000000f1a04', 'parent@home.example', 'A Parent');

-- Qalam's staff send the consent to the parent, the teacher copied.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a01');
select isnt(programmes.qalam_consent_link('parent@home.example', 'teacher@school.example', 'Baghdad High'), null,
  'The consent goes to the parent, with the teacher''s copy');
select pg_temp.logout();
select is((select sent_to || ' / ' || copy_to from governance.form_links where form_key = 'qalam-parent-consent'),
  'parent@home.example / teacher@school.example', 'to the parent''s own address');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a02');
select throws_ok(
  $$ select programmes.qalam_consent_link('p@home.example', 't@school.example') $$,
  '42501', null, 'Only Qalam''s staff send it');
select pg_temp.logout();

-- The signed consent (by link; the parent signs).
insert into governance.form_submissions (id, form_key, status, data, signer_name, signed_at, submitted_at)
values ('00000000-0000-0000-0000-0000000f1c01', 'qalam-parent-consent', 'submitted',
  '{"school": "Baghdad High", "grade": "11", "photos": "no_photos", "publishing": ["qirtas"]}',
  'A Parent', now(), now());

-- Staff can't add a student by typing a name any more.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a01');
select throws_ok(
  $$ insert into programmes.qalam_students (user_id, year, school)
     values ('00000000-0000-0000-0000-0000000f1a03', 2028, 'Baghdad High') $$,
  '42501', null,
  'Staff never add a student by hand'
);
select throws_ok(
  $$ select programmes.qalam_enroll('00000000-0000-0000-0000-0000000f1c01', '00000000-0000-0000-0000-0000000f1a03', '00000000-0000-0000-0000-0000000f1a04') $$,
  '42501', null,
  'and can''t enroll one: only the consent does'
);
select pg_temp.logout();

-- The consent enrolls the student (as the API route does, with the secret key).
set local role service_role;
select isnt(programmes.qalam_enroll('00000000-0000-0000-0000-0000000f1c01', '00000000-0000-0000-0000-0000000f1a03', '00000000-0000-0000-0000-0000000f1a04'), null,
  'The parent''s consent puts the student on the roster');
reset role;

select is(private.membership_kind('00000000-0000-0000-0000-0000000f1a03'), 'guest',
  'on a guest account');
select ok(private.is_qalam_student('00000000-0000-0000-0000-0000000f1a03'),
  'with the Qalam student role');
select is((select school || ' · ' || coalesce(grade, '') from programmes.qalam_students
  where user_id = '00000000-0000-0000-0000-0000000f1a03'), 'Baghdad High · 11',
  'the school and grade from the consent');
select is((select photos_allowed::text || publishing_allowed::text from programmes.qalam_students
  where user_id = '00000000-0000-0000-0000-0000000f1a03'), 'falsetrue',
  'and its photo and publishing answers');
select is(private.membership_kind('00000000-0000-0000-0000-0000000f1a04'), 'guest',
  'The parent has a guest account');
select is((select scope_id from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000f1a04' and role = 'parent'),
  '00000000-0000-0000-0000-0000000f1a03'::uuid, 'with the Parent role on their child');
select ok((select reference ~ '^AGR-\d{4}-\d{4}$' and verification_code is not null
  from governance.form_submissions where id = '00000000-0000-0000-0000-0000000f1c01'),
  'The signed consent has its AGR number and verification code');
select is((select kind from governance.verify_agreement(
    (select verification_code from governance.form_submissions where id = '00000000-0000-0000-0000-0000000f1c01'))),
  'qalam-parent-consent', '/verify names it by its name');
select is((select subject_user_id from governance.form_submissions where id = '00000000-0000-0000-0000-0000000f1c01'),
  '00000000-0000-0000-0000-0000000f1a03'::uuid, 'The consent is about the student''s account');

-- The roster reads names from the accounts, for Qalam's staff only.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a01');
select is((select full_name_en from programmes.qalam_roster(null)), 'Sara Ahmed',
  'The roster names the student from their account');
select lives_ok(
  $$ update programmes.qalam_students set status = 'accepted', sessions_attended = 1
     where user_id = '00000000-0000-0000-0000-0000000f1a03' $$,
  'Staff keep the roster');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a02');
select is((select count(*)::int from programmes.qalam_students), 0, 'Members never read the roster');
select is((select count(*)::int from programmes.qalam_roster(null)), 0, 'nor its names');
select pg_temp.logout();
select pg_temp.login_anon();
select throws_ok(
  $$ select count(*) from programmes.qalam_students $$,
  '42501', null,
  'and visitors are refused'
);
select pg_temp.logout();

-- The card (decisions.md, the card): first name and last initial, the
-- second line "Guest · Qalam student", and the school and the summer.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a03');
select is((select name_en || ' / ' || name_ar from membership.my_card_name()), 'Sara A. / سارة أ.',
  'A Qalam student''s card shows the first name and last initial');
select is((select role_en from membership.my_card_face()), 'Qalam student',
  'and the role beside the class');
select is((select school || ' · ' || year from membership.my_card_qalam()),
  'Baghdad High · ' || greatest(extract(year from now() at time zone 'Asia/Baghdad')::integer, 2028),
  'and the school and the summer');
select pg_temp.logout();

select is((select school from membership.verify_card_qalam(
    (select code from membership.cards where user_id = '00000000-0000-0000-0000-0000000f1a03'), null)),
  null, 'The check page shows the school only for a live code');

-- The release goes out for a student on the roster; the link names them.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a01');
select isnt(programmes.qalam_release_link(
    (select id from programmes.qalam_students where user_id = '00000000-0000-0000-0000-0000000f1a03'),
    'parent@home.example', 'teacher@school.example', 'Baghdad High'), null,
  'A release link is sent to a parent for a student on the roster');
select pg_temp.logout();
select is((select subject_user from governance.form_links where form_key = 'qalam-publishing-consent' and copy_to = 'teacher@school.example'),
  '00000000-0000-0000-0000-0000000f1a03'::uuid, 'and names the student''s account');

-- The role ends with the program; the guest account stays.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1a01');
update programmes.qalam_students set status = 'finished'
where user_id = '00000000-0000-0000-0000-0000000f1a03';
select pg_temp.logout();
select ok(not private.is_qalam_student('00000000-0000-0000-0000-0000000f1a03'),
  'Finishing ends the Qalam student role');
select ok(not exists (select 1 from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000f1a04'
    and role = 'parent' and (ends_at is null or ends_at > now())),
  'and the parent''s Qalam role');
select is(private.membership_kind('00000000-0000-0000-0000-0000000f1a03'), 'guest',
  'and the guest account stays');

select * from finish();
rollback;
