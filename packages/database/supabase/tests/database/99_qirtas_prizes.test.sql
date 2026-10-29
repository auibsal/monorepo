-- The Qirtas Prizes (migration 20261029000600).
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
select plan(13);

select is(
  (select array_agg(key order by sort) from journal.prizes),
  array['mutanabbi', 'tabari', 'jahiz', 'nazik', 'wasiti', 'ibn_al_haytham'],
  'Six prizes'
);
select is(
  (select shortlist_on::text || ' ' || awarded_on::text from journal.prize_rounds where slug = '2027'),
  '2027-04-04 2027-04-20',
  'The first round: shortlists April 4, awarded April 20, 2027'
);

select pg_temp.make_user('00000000-0000-0000-0000-0000000066a1', 'eic.prize@auib.edu.iq', 'Editor in Chief');
select pg_temp.make_user('00000000-0000-0000-0000-0000000066a2', 'writer.prize@auib.edu.iq', 'Prize Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000066a3', 'member.prize@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000066a1', 'eic');

insert into journal.contributors (id, slug, name_en, name_ar, user_id) values
  ('c0000000-0000-0000-0000-0000000066c1', 'prize-writer', 'Prize Writer', 'كاتب الجائزة',
   '00000000-0000-0000-0000-0000000066a2');
insert into journal.pieces (id, slug, category, language, title_en, title_ar, status, published_at, contributor_id) values
  ('d0000000-0000-0000-0000-0000000066d1', 'prize-poem', 'poetry', 'en', 'A Poem', 'قصيدة', 'published',
   now() - interval '10 days', 'c0000000-0000-0000-0000-0000000066c1'),
  ('d0000000-0000-0000-0000-0000000066d2', 'prize-draft', 'poetry', 'en', 'A Draft', 'مسودة', 'editing',
   null, 'c0000000-0000-0000-0000-0000000066c1');
-- A round already past its days, to see what the public sees.
insert into journal.prize_rounds (id, slug, title_en, title_ar, shortlist_on, awarded_on, is_published) values
  ('e0000000-0000-0000-0000-0000000066e1', 'past', 'Past', 'سابقة', current_date - 20, current_date - 5, true),
  ('e0000000-0000-0000-0000-0000000066e2', 'soon', 'Soon', 'قريبًا', current_date - 2, current_date + 10, true);

select pg_temp.login_as('00000000-0000-0000-0000-0000000066a3');
select throws_ok(
  $$ insert into journal.prize_entries (round_id, prize_key, piece_id)
     values ('e0000000-0000-0000-0000-0000000066e1', 'nazik', 'd0000000-0000-0000-0000-0000000066d1') $$,
  '42501', null, 'Members do not shortlist'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000066a1');
select lives_ok(
  $$ insert into journal.prize_entries (round_id, prize_key, piece_id, won) values
       ('e0000000-0000-0000-0000-0000000066e1', 'nazik', 'd0000000-0000-0000-0000-0000000066d1', true),
       ('e0000000-0000-0000-0000-0000000066e2', 'nazik', 'd0000000-0000-0000-0000-0000000066d1', true) $$,
  'The Editor-in-Chief shortlists and records a winner'
);
select throws_ok(
  $$ insert into journal.prize_entries (round_id, prize_key, piece_id)
     values ('e0000000-0000-0000-0000-0000000066e1', 'tabari', 'd0000000-0000-0000-0000-0000000066d1') $$,
  '22023', 'prize_wrong_section', 'A prize takes work from its own section'
);
select throws_ok(
  $$ insert into journal.prize_entries (round_id, prize_key, piece_id)
     values ('e0000000-0000-0000-0000-0000000066e1', 'nazik', 'd0000000-0000-0000-0000-0000000066d2') $$,
  '22023', 'prize_piece_unpublished', 'Only published work is shortlisted'
);
select lives_ok(
  $$ insert into journal.prize_judges (round_id, prize_key, name_en, name_ar)
     values ('e0000000-0000-0000-0000-0000000066e1', 'nazik', 'A Judge', 'حكم') $$,
  'and names a judge'
);

select pg_temp.login_anon();
select is(
  (select won from journal.prize_results('past') where piece_slug = 'prize-poem'), true,
  'After the award the public sees the winner'
);
select is(
  (select won from journal.prize_results('soon') where piece_slug = 'prize-poem'), false,
  'Before it, a winner shows only as shortlisted'
);
select throws_ok($$ select * from journal.prize_judges $$, '42501', null,
  'The judges are kept in the Diwan');

select pg_temp.login_as('00000000-0000-0000-0000-0000000066a1');
select throws_ok(
  $$ select journal.prepare_prize_certificates('e0000000-0000-0000-0000-0000000066e2') $$,
  '22023', 'prizes_not_awarded', 'No certificates before the award'
);
select is(journal.prepare_prize_certificates('e0000000-0000-0000-0000-0000000066e1'), 1,
  'After it, a certificate is drafted for the winner');
select pg_temp.logout();
select is(
  (select citation_en from membership.certificates
   where user_id = '00000000-0000-0000-0000-0000000066a2' and kind = 'prize'),
  'won the Nazik Prize for “A Poem”',
  'naming the prize and the piece'
);

select * from finish();
rollback;
