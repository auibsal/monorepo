-- Next Stop (decisions.md, Next Stop): no episode is published until
-- everyone on camera has signed F-15; credits come from the episode's roles.
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

select plan(14);

select pg_temp.make_user('00000000-0000-0000-0000-00000000d5a1', 'ns-media@auib.edu.iq', 'Media Director');
select pg_temp.make_user('00000000-0000-0000-0000-00000000d5a2', 'ns-host@auib.edu.iq', 'Show Host');
select pg_temp.make_user('00000000-0000-0000-0000-00000000d5a3', 'ns-member@auib.edu.iq', 'Plain Member');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000d5a1', 'media_director');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000d5a2', 'next_stop_host');

insert into programmes.episodes (id, programme_id, slug, number, title_en, title_ar, youtube_id)
select '00000000-0000-0000-0000-00000000e501', id, 'pilot', 1, 'The pilot', 'الحلقة التجريبية', 'abcdefghijk'
from core.programmes where slug = 'next-stop';

select pg_temp.login_as('00000000-0000-0000-0000-00000000d5a1');
select throws_ok(
  $$ update programmes.episodes set published_at = now() where id = '00000000-0000-0000-0000-00000000e501' $$,
  '23514', 'releases_missing', 'An episode with no one on camera is not published');

select lives_ok(
  $$ insert into programmes.episode_on_camera (id, episode_id, user_id)
     values ('00000000-0000-0000-0000-00000000e5c1', '00000000-0000-0000-0000-00000000e501',
       '00000000-0000-0000-0000-00000000d5a2') $$,
  'Media lists the host on camera');
-- No typed names (the third prompt, §1): a guest from outside is invited
-- by email, and their name is the one they sign the release with.
select throws_ok(
  $$ insert into programmes.episode_on_camera (episode_id, guest_name_en, is_guest)
     values ('00000000-0000-0000-0000-00000000e501', 'Typed Name', true) $$,
  '22023', 'invite_by_email_first', 'A guest''s name is not typed');
select lives_ok(
  $$ select programmes.invite_on_camera('00000000-0000-0000-0000-00000000e501', 'guest@example.org') $$,
  'and a guest is invited by email');
select pg_temp.logout();
update programmes.episode_on_camera set id = '00000000-0000-0000-0000-00000000e5c2'
where episode_id = '00000000-0000-0000-0000-00000000e501' and user_id is null;
select pg_temp.login_as('00000000-0000-0000-0000-00000000d5a1');
select isnt(
  (select programmes.episode_release_link('00000000-0000-0000-0000-00000000e5c1')), null,
  'A release link goes to the member''s own address');
select throws_ok(
  $$ update programmes.episodes set published_at = now() where id = '00000000-0000-0000-0000-00000000e501' $$,
  '23514', 'releases_missing', 'Unsigned releases keep it off the site');

select pg_temp.login_as('00000000-0000-0000-0000-00000000d5a3');
select is((select count(*)::int from programmes.episode_on_camera), 0,
  'Nobody outside Media sees who is on camera');
select throws_ok(
  $$ select programmes.episode_release_link('00000000-0000-0000-0000-00000000e5c2', 'guest@example.org') $$,
  '42501', null, 'Only Media sends release links');

-- Both sign: the links are used.
select pg_temp.logout();
insert into governance.form_submissions (id, form_key, data, status, submitted_at, form_version, signer_name, signed_at)
values ('00000000-0000-0000-0000-00000000e5f1', 'f15', '{}', 'submitted', now(), 1, 'Show Host', now()),
       ('00000000-0000-0000-0000-00000000e5f2', 'f15', '{}', 'submitted', now(), 1, 'Guest Speaker', now());
update governance.form_links set submission_id = '00000000-0000-0000-0000-00000000e5f1', used_at = now()
where id = (select form_link_id from programmes.episode_on_camera where id = '00000000-0000-0000-0000-00000000e5c1');
select is(
  (select release_id from programmes.episode_on_camera where id = '00000000-0000-0000-0000-00000000e5c1'),
  '00000000-0000-0000-0000-00000000e5f1'::uuid, 'A used link records the release');
update governance.form_links set submission_id = '00000000-0000-0000-0000-00000000e5f2', used_at = now()
where id = (select form_link_id from programmes.episode_on_camera where id = '00000000-0000-0000-0000-00000000e5c2');
select is(
  (select guest_name_en from programmes.episode_on_camera where id = '00000000-0000-0000-0000-00000000e5c2'),
  'Guest Speaker', 'The guest''s name is the one they signed with');

select pg_temp.login_as('00000000-0000-0000-0000-00000000d5a1');
select lives_ok(
  $$ update programmes.episodes set published_at = now() - interval '1 minute'
     where id = '00000000-0000-0000-0000-00000000e501' $$,
  'With every release signed, it is published');

-- Media names the director; the credits run in order, for anyone.
select isnt(
  (select programmes.credit_episode('00000000-0000-0000-0000-00000000e501',
    '00000000-0000-0000-0000-00000000d5a3', 'directed_by')), null,
  'Media credits the crew of an episode');
select pg_temp.login_anon();
select is(
  (select array_agg(credit order by credit_order) from programmes.episode_credits('00000000-0000-0000-0000-00000000e501')),
  array['directed_by', 'host', 'guests'],
  'Credits run Directed by, Host, Guests (the standing host when none is named)');
select is(
  (select name_en from programmes.episode_credits('00000000-0000-0000-0000-00000000e501') where credit = 'directed_by'),
  'Plain Member', 'A director is credited by name only');

select * from finish();
rollback;
