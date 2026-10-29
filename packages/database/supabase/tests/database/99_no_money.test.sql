-- No money (migration 20261030000100): no Treasurer, no spending, no costs;
-- needs lists in their place; the collection record kept, with the
-- General Secretary witnessing and the handover on the campaign.
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

select plan(17);

select is((select count(*)::integer from access.roles where key = 'treasurer'), 0, 'There is no Treasurer');
select is((select count(*)::integer from access.permissions where key like 'spending.%'), 0, 'There are no spending permissions');
select hasnt_table('governance', 'spending_approvals', 'The spending log is gone');
select hasnt_column('access', 'roles', 'spending_limit_iqd', 'Roles carry no spending limit');
select hasnt_column('charity', 'campaigns', 'cost_per_unit_iqd', 'Campaigns carry no cost');
select is((select count(*)::integer from governance.form_types where key = 'f13'), 0, 'The Expense Claim is gone');
select ok(
  exists (select 1 from access.role_permissions where role = 'general_secretary' and permission = 'charity.ledger.signoff'),
  'The General Secretary signs off the collection''s counts'
);

select pg_temp.make_user('00000000-0000-0000-0000-00000000b0a1', 'salon.lead@auib.edu.iq', 'Salon Lead');
select pg_temp.make_user('00000000-0000-0000-0000-00000000b0a2', 'gs-nm@auib.edu.iq', 'General Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-00000000b0a3', 'member-nm@auib.edu.iq', 'Member');
select pg_temp.make_user('00000000-0000-0000-0000-00000000b0a4', 'editor-nm@auib.edu.iq', 'Editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000b0a1', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'salon'));
select pg_temp.grant_role('00000000-0000-0000-0000-00000000b0a2', 'general_secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000b0a4', 'eic');

-- ── Needs lists ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000b0a1');
select lives_ok(
  $$ insert into programmes.needs (id, programme_id, item, quantity, needed_by, purpose)
     values ('0ee00000-0000-0000-0000-0000000000a1', (select id from core.programmes where slug = 'salon'),
       'Tea urn', 1, '2026-12-01', 'Tea for the Salon') $$,
  'A program''s lead lists what it needs'
);
select throws_ok(
  $$ insert into programmes.needs (programme_id, item, quantity, needed_by, purpose)
     values ((select id from core.programmes where slug = 'company'), 'Lights', 2, '2026-12-01', 'Stage') $$,
  '42501', null, 'but only for their own program'
);
select throws_ok(
  $$ update programmes.needs set status = 'requested', requested_on = current_date
     where id = '0ee00000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'Only the General Secretary sends a request to Student Life'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000b0a3');
select is((select count(*)::integer from programmes.needs), 0, 'Members do not see the needs lists');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b0a4');
select lives_ok(
  $$ insert into programmes.needs (programme_id, item, quantity, needed_by, purpose)
     values ((select id from core.programmes where slug = 'waraq'), 'Printing of the Edition', 100, '2027-02-15', 'Edition 1') $$,
  'The Editor lists the paper''s needs'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000b0a2');
select is((select count(*)::integer from programmes.needs), 2, 'The General Secretary sees every list');
select lives_ok(
  $$ update programmes.needs set status = 'requested', requested_on = current_date
     where id = '0ee00000-0000-0000-0000-0000000000a1' $$,
  'and logs what was asked'
);
select lives_ok(
  $$ update programmes.needs set status = 'provided', provided_on = current_date, provided_note = 'From Student Life'
     where id = '0ee00000-0000-0000-0000-0000000000a1' $$,
  'and what was provided, and when'
);

-- ── The handover ────────────────────────────────────────────────────────────

select pg_temp.logout();
insert into charity.campaigns (id, slug, title_en, title_ar, status)
values ('ca000000-0000-0000-0000-0000000000f1', 'second-chapter-test', 'Second Chapter', 'الفصل الثاني', 'active');
select throws_ok(
  $$ update charity.campaigns set handed_over_on = '2026-11-15' where id = 'ca000000-0000-0000-0000-0000000000f1' $$,
  '23514', null, 'A handover records the amount with the day'
);
select lives_ok(
  $$ update charity.campaigns set handed_over_on = '2026-11-15', handed_over_iqd = 100000,
       handover_witness = '00000000-0000-0000-0000-00000000b0a2'
     where id = '0ee00000-0000-0000-0000-0000000000a1'::uuid or id = 'ca000000-0000-0000-0000-0000000000f1' $$,
  'The witnessed handover is kept on the campaign'
);

select * from finish();
rollback;
