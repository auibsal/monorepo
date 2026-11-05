-- The design review, PR 4e (Nov 4, 2026): Open Pages prompt cards (A35).
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

select plan(7);

select pg_temp.make_user('00000000-0000-0000-0000-0000000ea001', 'lead.ea@auib.edu.iq', 'Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ea002', 'member.ea@auib.edu.iq', 'Member');

insert into charity.campaigns (id, slug, title_en, title_ar, status) values
  ('ca000000-0000-0000-0000-00000000ea01', 'ea-fair', 'A Fair', 'معرض', 'active'),
  ('ca000000-0000-0000-0000-00000000ea02', 'ea-draft', 'A Draft', 'مسودة', 'draft');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000ea001', 'campaign_lead', 'campaign', 'ca000000-0000-0000-0000-00000000ea01');

select has_column('charity', 'catalog_books', 'title', 'a book has a title');
select hasnt_column('charity', 'catalog_books', 'price_iqd', 'and never a price');

select pg_temp.login_as('00000000-0000-0000-0000-0000000ea001');
select lives_ok(
  $$ insert into charity.catalog_books (campaign_id, title, author, language, is_listed) values
     ('ca000000-0000-0000-0000-00000000ea01', 'A Listed Book', 'An Author', 'en', true),
     ('ca000000-0000-0000-0000-00000000ea01', 'Not Yet', null, 'ar', false) $$,
  'the campaign''s lead lists books');
select throws_ok(
  $$ insert into charity.catalog_books (campaign_id, title) values
     ('ca000000-0000-0000-0000-00000000ea02', 'Elsewhere') $$,
  '42501', null, 'but not on another campaign');

select pg_temp.login_anon();
select is((select count(*)::int from charity.catalog_books where campaign_id = 'ca000000-0000-0000-0000-00000000ea01'), 1,
  'a visitor sees the listed books only');

select pg_temp.login_as('00000000-0000-0000-0000-0000000ea002');
select throws_ok(
  $$ insert into charity.catalog_books (campaign_id, title) values
     ('ca000000-0000-0000-0000-00000000ea01', 'Mine') $$,
  '42501', null, 'a member does not add books');

select pg_temp.login_as('00000000-0000-0000-0000-0000000ea001');
select is((select count(*)::int from charity.catalog_books where campaign_id = 'ca000000-0000-0000-0000-00000000ea01'), 2,
  'the lead sees the unlisted too');

select * from finish();
rollback;
