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
select plan(9);

-- decisions.md, The site (receipts and undo): a delete waits 30 days in Recently deleted.
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, published_at) values
  ('e0000000-0000-0000-0000-0000000000b1', 'open-night-2026-12-01', 'Open night', 'ليلة مفتوحة',
    now() + interval '10 days', 'published', now()),
  ('e0000000-0000-0000-0000-0000000000b2', 'draft-reading-2026-12-02', 'Draft reading', 'قراءة مسودة',
    now() + interval '11 days', 'draft', null);
insert into governance.partners (id, slug, name_en, kind, relation) values
  ('d0000000-0000-0000-0000-0000000000b1', 'reading-circle', 'Reading circle', 'club', 'campus'),
  ('d0000000-0000-0000-0000-0000000000b2', 'old-press', 'Old press', 'publisher', 'campus');
insert into events.event_organizations (event_id, partner_id, line)
values ('e0000000-0000-0000-0000-0000000000b1', 'd0000000-0000-0000-0000-0000000000b1', 'cosponsor');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');

select throws_ok(
  $$ select core.trash_record('event', 'e0000000-0000-0000-0000-0000000000b1') $$,
  '23514', 'unpublish_first', 'A published event is unpublished before it is deleted'
);
select throws_ok(
  $$ select core.trash_record('partner', 'd0000000-0000-0000-0000-0000000000b1') $$,
  '23514', 'in_use', 'A partner on an event is not deleted'
);
select is(
  (select jsonb_array_length(core.record_uses('partner', 'd0000000-0000-0000-0000-0000000000b1')->'uses')),
  1, 'The confirmation names where the partner is used'
);
select lives_ok(
  $$ select core.trash_record('event', 'e0000000-0000-0000-0000-0000000000b2') $$,
  'A draft event moves to Recently deleted'
);
select is(
  (select count(*)::int from api.events where id = 'e0000000-0000-0000-0000-0000000000b2'),
  0, 'A deleted event is hidden from every read'
);
select is(
  (select count(*)::int from core.recently_deleted('event')), 1,
  'It waits in the area''s Recently deleted'
);
select throws_ok(
  $$ update governance.partners set deleted_at = now() where id = 'd0000000-0000-0000-0000-0000000000b2' $$,
  '42501', null, 'A client does not set the deleted columns itself'
);
select lives_ok(
  $$ select core.restore_record('event', 'e0000000-0000-0000-0000-0000000000b2') $$,
  'Restore brings it back'
);

select pg_temp.logout();
update events.events set deleted_at = now() - interval '31 days' where id = 'e0000000-0000-0000-0000-0000000000b2';
select is(private.purge_recently_deleted(), 1, 'After 30 days the retention job removes it');

select * from finish();
rollback;
