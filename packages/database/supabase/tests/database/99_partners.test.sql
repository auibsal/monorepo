-- Partnerships (P11, P8): the register, memoranda signed only through the
-- RPC and never by someone with a declared conflict, the public listing,
-- member offers and affiliations.
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

select plan(21);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'director-pt@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'president-pt@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'vp-pt@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a4', 'member-pt@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000b1', 'poet-pt@gmail.com');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a1', 'vice_president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a2', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a3', 'vice_president');

-- Partners come only from applications (decisions §10): nobody adds one or
-- drafts a memorandum in the Diwan.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ insert into governance.partners (id, slug, name_en, kind, is_listed, description_en)
     values ('00000000-0000-0000-0000-00000000d009', 'made-here', 'Made Here', 'cultural', true, 'No.') $$,
  '42501', null,
  'Nobody adds a partner in the Diwan'
);
select throws_ok(
  $$ insert into governance.partner_agreements (partner_id, purpose_en, starts_on)
     values ('00000000-0000-0000-0000-00000000d009', 'Drafted here', current_date) $$,
  '42501', null,
  'or drafts a memorandum'
);
-- An application as the apply page leaves it, signed by the partner.
select pg_temp.logout();
insert into governance.partners (id, slug, name_en, kind, is_listed, description_en)
values ('00000000-0000-0000-0000-00000000d001', 'poetry-hub', 'Poetry Hub', 'cultural', true, 'Poetry in Baghdad.');
insert into governance.partner_agreements (id, partner_id, purpose_en, starts_on, grants, partner_signatory)
values ('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-00000000d001',
  'Poetry Hub members submit to the Journal; joint readings.', current_date - 1,
  '{journal_submissions}', 'Partner Head');
select throws_ok(
  $$ insert into governance.partner_agreements (partner_id, purpose_en, starts_on, status, signed_by, signed_at)
     values ('00000000-0000-0000-0000-00000000d001', 'Pre-signed', current_date, 'signed',
       '00000000-0000-0000-0000-0000000000a1', now()) $$,
  '22023', 'agreement_starts_draft',
  'A memorandum cannot be written as already signed'
);
select pg_temp.council_resolution();
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ update governance.partner_agreements set status = 'signed',
       signed_by = '00000000-0000-0000-0000-0000000000a1', signed_at = now()
     where id = '00000000-0000-0000-0000-00000000d101' $$,
  '42501', 'sign_through_rpc',
  'or signed by a direct update'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4');
select throws_ok(
  $$ select governance.record_partner_vote('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-0000000c0001') $$,
  '42501', 'not_allowed',
  'Nobody without partners.sign records the vote'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');

-- Before signing, nothing is public.
select pg_temp.login_anon();
select is((select count(*)::int from governance.public_partners()), 0,
  'An unsigned partner is not listed publicly');

-- The President has declared a conflict with this partner (P8.3).
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
insert into governance.conflict_declarations (id, role_title)
values ('00000000-0000-0000-0000-00000000d201', 'President');
insert into governance.conflict_items (declaration_id, kind, partner_id, what)
values ('00000000-0000-0000-0000-00000000d201', 'partner_role', '00000000-0000-0000-0000-00000000d001',
  'I sit on the partner''s board.');
select throws_ok(
  $$ select governance.record_partner_vote('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-0000000c0001') $$,
  '42501', 'conflict_declared',
  'Someone with a declared conflict cannot record the partner''s vote'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  $$ select governance.record_partner_vote('00000000-0000-0000-0000-00000000d101', gen_random_uuid()) $$,
  '22023', 'needs_council_resolution',
  'Only an adopted Council resolution approves a partnership'
);
select lives_ok(
  $$ select governance.record_partner_vote('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-0000000c0001') $$,
  'The Vice President records it instead'
);
select pg_temp.logout();
select is((select status from governance.partners where id = '00000000-0000-0000-0000-00000000d001'), 'active',
  'The Council''s vote makes an applicant an active partner');
select is((select signed_by from governance.partner_agreements where id = '00000000-0000-0000-0000-00000000d101'),
  '00000000-0000-0000-0000-0000000000a3'::uuid, 'and records who signed');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ update governance.partner_agreements set purpose_en = 'Something else'
     where id = '00000000-0000-0000-0000-00000000d101' $$,
  '22023', 'agreement_signed',
  'What a signed memorandum says cannot be changed'
);
select lives_ok(
  $$ update governance.partner_agreements set renew_by = current_date + 300, student_life_informed_on = current_date
     where id = '00000000-0000-0000-0000-00000000d101' $$,
  'but its renewal date and Student Life notice can'
);
select hasnt_table('governance', 'member_offers',
  'Partners list no perks or offers for members (decisions §2)');

select pg_temp.login_anon();
select is((select array_agg(slug) from governance.public_partners()), array['poetry-hub'],
  'A signed, active, listed partner appears publicly');
select throws_ok(
  $$ select count(*) from governance.partners $$,
  '42501', null,
  'Visitors cannot read the register itself'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from governance.partners), 0,
  'A verified member does not read the register');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(
  $$ insert into governance.partner_affiliations (partner_id, status)
     values ('00000000-0000-0000-0000-00000000d001', 'verified') $$,
  '42501', null,
  'Nobody can verify their own affiliation'
);
-- People reach a partner through its invitations (owner, Oct 31, 2026):
-- here the affiliation waits as a shareable link leaves it.
select pg_temp.logout();
insert into governance.partner_affiliations (partner_id, user_id, note)
values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', 'Member since 2024');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
update governance.partner_affiliations set status = 'verified'
where user_id = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.logout();
select ok(private.is_affiliated('00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-00000000d001', 'journal_submissions'),
  'A verified affiliation counts for what the memorandum grants');
select ok(not private.is_affiliated('00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-00000000d001', 'productions'),
  'and nothing else');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1',
  '{"client_id": "00000000-0000-0000-0000-00000000a002"}');
select is((select count(*)::int from governance.partners), 0,
  'Third-party apps never read the register');

select * from finish();
rollback;
