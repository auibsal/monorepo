-- Charity ledger: append-only, two counters, second-person sign-off, and
-- totals that count signed-off entries only.
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

select plan(20);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000c1', 'lead@auib.edu.iq', 'Campaign Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000c2', 'helper@auib.edu.iq', 'Helper');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000d1', 'gs@auib.edu.iq', 'General Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'member@auib.edu.iq', 'Member');

insert into governance.partners (slug, name_en, name_ar, kind) values ('test-partner', 'Test Partner', 'شريك تجريبي', 'charity');
insert into charity.campaigns (id, slug, title_en, title_ar, status, partner_id)
values ('ca000000-0000-0000-0000-0000000000c1', 'winter-2026', 'Winter 2026', 'شتاء ٢٠٢٦', 'active',
  (select id from governance.partners where slug = 'test-partner'));

select pg_temp.grant_role('00000000-0000-0000-0000-0000000000c1', 'campaign_lead', 'campaign', 'ca000000-0000-0000-0000-0000000000c1');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000d1', 'general_secretary');

-- ── Recording ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ insert into charity.ledger_entries (campaign_id, amount_iqd, source, counted_by, counted_with)
     values ('ca000000-0000-0000-0000-0000000000c1', 80000, 'table_cash',
       '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c2') $$,
  '42501', null,
  'Members cannot write to the ledger'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ insert into charity.ledger_entries (campaign_id, amount_iqd, source, counted_by, counted_with)
     values ('ca000000-0000-0000-0000-0000000000c1', 80000, 'table_cash',
       '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1') $$,
  '23514', null,
  'Cash must be counted by two different people'
);

insert into charity.ledger_entries (campaign_id, amount_iqd, source, counted_by, counted_with, note)
values
  ('ca000000-0000-0000-0000-0000000000c1', 80000, 'table_cash',
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', 'first'),
  ('ca000000-0000-0000-0000-0000000000c1', 15000, 'fill_a_bag',
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', 'second');

select pg_temp.logout();
create function pg_temp.entry(label text) returns uuid language sql as $$
  select id from charity.ledger_entries where note = label;
$$;
grant execute on function pg_temp.entry(text) to public;
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');

select is((select count(*) from charity.ledger_entries)::integer, 2, 'The ledger writer records entries');

-- ── Append-only ─────────────────────────────────────────────────────────────

select throws_ok(
  $$ update charity.ledger_entries set amount_iqd = 1 where id = pg_temp.entry('first') $$,
  '42501', null,
  'Ledger entries cannot be edited by a client'
);
select throws_ok(
  $$ delete from charity.ledger_entries where id = pg_temp.entry('first') $$,
  '42501', null,
  'Ledger entries cannot be deleted by a client'
);

select pg_temp.logout();
select throws_ok(
  $$ update charity.ledger_entries set amount_iqd = 1 where id = pg_temp.entry('first') $$,
  '42501', null,
  'Ledger entries cannot be edited even by the database owner'
);
select throws_ok(
  $$ delete from charity.ledger_entries where id = pg_temp.entry('first') $$,
  '42501', null,
  'Ledger entries cannot be deleted even by the database owner'
);

-- ── Sign-off ────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select is(
  (select counted_iqd from charity.campaign_progress('ca000000-0000-0000-0000-0000000000c1')),
  0::bigint,
  'Entries without a second signer are excluded from totals'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ insert into charity.ledger_signoffs (entry_id) values (pg_temp.entry('first')) $$,
  '23514', null,
  'The person who recorded an entry cannot sign it off'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok(
  $$ insert into charity.ledger_signoffs (entry_id) values (pg_temp.entry('first')) $$,
  'A different person (the General Secretary, who witnesses the counts) signs it off'
);
select throws_ok(
  $$ delete from charity.ledger_signoffs where entry_id = pg_temp.entry('first') $$,
  '42501', null,
  'Sign-offs cannot be withdrawn'
);

select pg_temp.login_anon();
select is(
  (select counted_iqd from charity.campaign_progress('ca000000-0000-0000-0000-0000000000c1')),
  80000::bigint,
  'Signed-off entries count'
);
select is(
  (select pending_iqd from charity.campaign_progress('ca000000-0000-0000-0000-0000000000c1')),
  15000::bigint,
  'What waits for a sign-off is shown apart'
);
select throws_ok(
  $$ select * from charity.ledger_entries $$,
  '42501', null,
  'Visitors cannot read the ledger itself'
);

-- ── Corrections ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ insert into charity.ledger_entries (campaign_id, amount_iqd, source, counted_by, counted_with, reverses_entry_id)
     values ('ca000000-0000-0000-0000-0000000000c1', -70000, 'table_cash',
       '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
       pg_temp.entry('first')) $$,
  '22023', null,
  'A reversal must cancel the original exactly'
);
select lives_ok(
  $$ insert into charity.ledger_entries (campaign_id, amount_iqd, source, counted_by, counted_with, reverses_entry_id, note)
     values ('ca000000-0000-0000-0000-0000000000c1', -80000, 'table_cash',
       '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
       pg_temp.entry('first'), 'Miscounted') $$,
  'Corrections are reversing entries'
);

-- ── One partner register ────────────────────────────────────────────────────

select pg_temp.logout();
select is(
  (select p.slug from charity.campaigns k join governance.partners p on p.id = k.partner_id
   where k.id = 'ca000000-0000-0000-0000-0000000000c1'),
  'test-partner', 'Campaigns name their partner from the one register'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select ok(
  exists (select 1 from governance.partner_names() where name_en = 'Test Partner'),
  'Members see the names of partners on the register'
);
select pg_temp.login_anon();
select throws_ok($$ select * from governance.partner_names() $$, '42501', null,
  'The public does not');

select pg_temp.logout();
select pg_temp.make_user('00000000-0000-0000-0000-0000000000e1', 'guest@partner.example', 'Partner Guest');
insert into governance.partner_affiliations (partner_id, user_id)
values ((select id from governance.partners where slug = 'test-partner'),
  '00000000-0000-0000-0000-0000000000e1');
update governance.partner_affiliations set status = 'verified'
where user_id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1', '{"aal":"aal1"}');
select is((select array_agg(name_en) from governance.partner_names()), array['Test Partner'],
  'A partner''s guest sees only their own partner''s name');

select * from finish();
rollback;
