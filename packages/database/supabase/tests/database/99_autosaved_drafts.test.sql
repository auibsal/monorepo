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

-- Autosave (decisions.md, The site): one drafts table, each person's own,
-- gone 30 days after its last change.
select plan(6);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f8001', 'draft.one@auib.edu.iq', 'Draft One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f8002', 'draft.two@auib.edu.iq', 'Draft Two');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f8001');
select lives_ok(
  $$ insert into api.drafts (record_key, data) values ('announcement:new', '{"title_en": "Half"}') $$,
  'Changes are kept as they are typed'
);
select is((select data->>'title_en' from api.drafts where record_key = 'announcement:new'), 'Half',
  'and found again on reopening');
select pg_temp.logout();

select pg_temp.login_as('00000000-0000-0000-0000-0000000f8002');
select is((select count(*)::int from api.drafts), 0, 'Nobody else sees them');
select throws_ok(
  $$ insert into api.drafts (user_id, record_key, data)
     values ('00000000-0000-0000-0000-0000000f8001', 'announcement:new', '{}') $$,
  '42501', null, 'or writes one for them'
);
select pg_temp.logout();

select pg_temp.login_as('00000000-0000-0000-0000-0000000f8001');
delete from api.drafts where record_key = 'announcement:new';
select is((select count(*)::int from api.drafts), 0, 'Saving deletes the draft');
select pg_temp.logout();

insert into core.drafts (user_id, record_key, data, updated_at)
values ('00000000-0000-0000-0000-0000000f8001', 'call:new', '{}', now() - interval '31 days');
select private.purge_autosaved_drafts();
select is((select count(*)::int from core.drafts where record_key = 'call:new'), 0,
  'and 30 days without a change does too');

select * from finish();
rollback;
