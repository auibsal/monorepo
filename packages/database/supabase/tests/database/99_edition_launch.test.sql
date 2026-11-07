-- An Edition's Launch Night (Nov 4, 2026): read only for a published Edition
-- or one with a published call; 'list' is not an Edition's slug.
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

select plan(6);

insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, status, entry) values
  ('e0000000-0000-0000-0000-0000000000a1', 'launch-night-test', (select id from core.programmes where slug = 'open-pages'),
    'Launch Night', 'ليلة الإطلاق', now() + interval '30 days', 'published', 'rsvp');
insert into journal.issues (id, volume, number, slug, title_en, title_ar, launch_event_id) values
  ('1a000000-0000-0000-0000-0000000000a1', 9, 1, 'edition-test-1', 'Secret', 'سري', 'e0000000-0000-0000-0000-0000000000a1'),
  ('1a000000-0000-0000-0000-0000000000a2', 9, 2, 'edition-test-2', 'Quiet', 'هادئ', 'e0000000-0000-0000-0000-0000000000a1');
insert into journal.calls (issue_id, title_en, title_ar, opens_at, closes_at, is_published) values
  ('1a000000-0000-0000-0000-0000000000a1', 'Call', 'دعوة', now() - interval '1 day', now() + interval '20 days', true);

select pg_temp.login_anon();
select is(
  journal.edition_launch('1a000000-0000-0000-0000-0000000000a1'),
  'e0000000-0000-0000-0000-0000000000a1'::uuid,
  'Anyone reads the Launch Night of an Edition with a published call'
);
select is(
  journal.edition_launch('1a000000-0000-0000-0000-0000000000a2'),
  null,
  'but not of an unpublished Edition with no call'
);
select is(
  (select count(*)::int from journal.issues where id = '1a000000-0000-0000-0000-0000000000a1'),
  0,
  'and the unpublished Edition itself stays hidden'
);
select pg_temp.logout();

update journal.issues set status = 'published', published_at = now()
where id = '1a000000-0000-0000-0000-0000000000a2';
select pg_temp.login_anon();
select is(
  journal.edition_launch('1a000000-0000-0000-0000-0000000000a2'),
  'e0000000-0000-0000-0000-0000000000a1'::uuid,
  'A published Edition shows its Launch Night'
);
select pg_temp.logout();

select throws_ok(
  $$ insert into journal.issues (volume, number, slug, title_en, title_ar) values (9, 3, 'list', 'L', 'ل') $$,
  '23514', null,
  '"list" is not an Edition''s slug'
);

delete from events.events where id = 'e0000000-0000-0000-0000-0000000000a1';
select is(
  (select launch_event_id from journal.issues where id = '1a000000-0000-0000-0000-0000000000a1'),
  null,
  'A deleted event leaves the Edition without a Launch Night'
);

select * from finish();
rollback;
