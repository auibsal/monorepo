-- Numbers and codes (decisions §6): CERT-, LTR-, RES-, MOU- and
-- TOUR-<year>-<three digits>, each series gapless, numbered by the site.
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
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'adopted', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

select plan(12);

select pg_temp.make_user('00000000-0000-0000-0000-0000000c0de1', 'numbers@auib.edu.iq', 'Numbers Person');
insert into governance.minutes (id, title_en, text_en, meeting_on, body, status, adopted_on)
values ('00000000-0000-0000-0000-0000000c0de2', 'Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'adopted', current_date);

-- ── Council resolutions ──────────────────────────────────────────────────────
insert into governance.resolutions (id, code, title_en, text_en, body, status, minutes_id)
values ('00000000-0000-0000-0000-0000000c0d01', 'R-2026-07', 'A draft', 'Text.', 'council', 'draft', '00000000-0000-0000-0000-0000000c0de2');
select is((select code from governance.resolutions where id = '00000000-0000-0000-0000-0000000c0d01'), null,
  'A draft resolution has no number, whatever was typed');

update governance.resolutions set status = 'adopted', adopted_on = '2026-11-10'
where id = '00000000-0000-0000-0000-0000000c0d01';
select is((select code from governance.resolutions where id = '00000000-0000-0000-0000-0000000c0d01'), 'RES-2026-001',
  'Adoption gives the year''s next number');

insert into governance.resolutions (id, title_en, text_en, body, status, minutes_id)
values ('00000000-0000-0000-0000-0000000c0d02', 'Failed', 'Text.', 'council', 'rejected', '00000000-0000-0000-0000-0000000c0de2');
insert into governance.resolutions (id, title_en, text_en, body, status, adopted_on, minutes_id)
values ('00000000-0000-0000-0000-0000000c0d03', 'Second', 'Text.', 'council', 'adopted', '2026-11-12', '00000000-0000-0000-0000-0000000c0de2');
select is((select code from governance.resolutions where id = '00000000-0000-0000-0000-0000000c0d03'), 'RES-2026-002',
  'A failed motion takes no number, so the series has no gaps');

update governance.resolutions set code = 'RES-2026-050' where id = '00000000-0000-0000-0000-0000000c0d03';
select is((select code from governance.resolutions where id = '00000000-0000-0000-0000-0000000c0d03'), 'RES-2026-002',
  'An adopted resolution keeps its number');
select throws_ok(
  $$ update governance.resolutions set status = 'withdrawn' where id = '00000000-0000-0000-0000-0000000c0d03' $$,
  '22023', 'resolution_adopted', 'and stays adopted'
);

-- ── Letters ──────────────────────────────────────────────────────────────────
insert into membership.service_letters (user_id, role_en, period_from)
values ('00000000-0000-0000-0000-0000000c0de1', 'Reporter, Qirtas', current_date - 30);
select matches((select reference from membership.service_letters where user_id = '00000000-0000-0000-0000-0000000c0de1'),
  '^LTR-\d{4}-001$', 'A letter gets the year''s next LTR- number');
select isnt((select verification_code from membership.service_letters where user_id = '00000000-0000-0000-0000-0000000c0de1'),
  (select reference from membership.service_letters where user_id = '00000000-0000-0000-0000-0000000c0de1'),
  'and its verification code is separate');

-- ── Memoranda ────────────────────────────────────────────────────────────────
insert into governance.partners (id, slug, name_en, kind, is_listed, description_en, status)
values ('00000000-0000-0000-0000-0000000c0d10', 'number-hub', 'Number Hub', 'cultural', false, 'Numbers.', 'prospect');
insert into governance.partner_agreements (id, partner_id, purpose_en, starts_on, partner_signatory, code)
values ('00000000-0000-0000-0000-0000000c0d11', '00000000-0000-0000-0000-0000000c0d10', 'Joint readings.', current_date, 'Partner Head', null);
select is((select code from governance.partner_agreements where id = '00000000-0000-0000-0000-0000000c0d11'), null,
  'A memorandum waiting for the Council has no number');
update governance.partner_agreements set status = 'signed', signed_at = now(), signed_by = '00000000-0000-0000-0000-0000000c0de1', resolution_id = '00000000-0000-0000-0000-0000000c0d01'
where id = '00000000-0000-0000-0000-0000000c0d11';
select matches((select code from governance.partner_agreements where id = '00000000-0000-0000-0000-0000000c0d11'),
  '^MOU-\d{4}-001$', 'The countersignature gives it the year''s next MOU- number');

-- ── Typewriter Tour pages ────────────────────────────────────────────────────
insert into programmes.six_words (user_id, text, language, page_ref)
values ('00000000-0000-0000-0000-0000000c0de1', 'The paper waited for the pen', 'en', 'TT26-014');
select matches((select reference from programmes.six_words where page_ref = 'TT26-014'),
  '^TOUR-\d{4}-\d{3}$', 'A Tour page gets its TOUR- number and keeps its scan reference');

-- ── Nobody writes the counters ───────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000c0de1');
select throws_ok($$ select * from core.code_counters $$, '42501', null,
  'Nobody reads the counters directly');
select throws_ok($$ select private.next_code('RES') $$, '42501', null,
  'or takes a number by hand');

select * from finish();
rollback;
