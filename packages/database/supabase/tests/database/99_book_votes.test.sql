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

select plan(14);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e6001', 'host.e6@auib.edu.iq', 'Host');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e6002', 'reader.e6@auib.edu.iq', 'Reader');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e6003', 'other.e6@auib.edu.iq', 'Other');
insert into events.events (id, slug, title_en, title_ar, starts_at, status, members_only, entry) values
  ('00000000-0000-0000-0000-0000000e6101', 'book-circle-e6', 'Book Circle', 'حلقة الكتاب', now() + interval '14 days', 'published', false, 'open'),
  ('00000000-0000-0000-0000-0000000e6102', 'salon-e6', 'The Salon', 'الصالون', now() + interval '21 days', 'published', false, 'open');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e6001', 'programme_lead', 'event',
  '00000000-0000-0000-0000-0000000e6101');

-- The host opens a ballot with three books.
select pg_temp.login_as('00000000-0000-0000-0000-0000000e6001');
select lives_ok(
  $$ insert into programmes.book_ballots (event_id, title_en, closes_at)
     values ('00000000-0000-0000-0000-0000000e6101', 'December''s book', now() + interval '7 days');
     insert into programmes.book_choices (ballot_id, title_en, author_en)
     select b.id, x.t, x.a from programmes.book_ballots b,
       (values ('One', 'A'), ('Two', 'B'), ('Three', 'C')) as x(t, a)
     where b.title_en = 'December''s book' $$,
  'the host opens a ballot with three books'
);
select throws_ok(
  $$ insert into programmes.book_choices (ballot_id, title_en)
     values ((select id from programmes.book_ballots where title_en = 'December''s book'), 'Four') $$,
  'P0001', 'three_books',
  'three books at most'
);
select throws_ok(
  $$ insert into programmes.book_ballots (event_id, title_en, closes_at)
     values ('00000000-0000-0000-0000-0000000e6102', 'Not mine', now() + interval '1 day') $$,
  '42501', null,
  'not for another event'
);

-- Members vote once and may change their vote.
select pg_temp.login_as('00000000-0000-0000-0000-0000000e6002');
delete from programmes.book_choices;
select is((select count(*)::int from programmes.book_choices), 3,
  'a member does not change the books');
select lives_ok(
  $$ insert into programmes.book_votes (ballot_id, choice_id)
     values ((select id from programmes.book_ballots where title_en = 'December''s book'), (select id from programmes.book_choices where title_en = 'One'));
     update programmes.book_votes set choice_id = (select id from programmes.book_choices where title_en = 'Two')
     where ballot_id = (select id from programmes.book_ballots where title_en = 'December''s book') $$,
  'a member votes and changes their vote'
);
select throws_ok(
  $$ insert into programmes.book_votes (ballot_id, choice_id)
     values ((select id from programmes.book_ballots where title_en = 'December''s book'), (select id from programmes.book_choices where title_en = 'Three')) $$,
  '23505', null,
  'one vote each'
);
select is((select count(*)::int from programmes.ballot_counts((select id from programmes.book_ballots where title_en = 'December''s book'))), 0,
  'no counts while the ballot is open');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e6003');
insert into programmes.book_votes (ballot_id, choice_id)
  values ((select id from programmes.book_ballots where title_en = 'December''s book'), (select id from programmes.book_choices where title_en = 'Two'));
select is((select count(*)::int from programmes.book_votes), 1, 'a member reads their own vote only');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e6001');
select is(
  (select votes from programmes.ballot_counts((select id from programmes.book_ballots where title_en = 'December''s book'))
   where choice_id = (select id from programmes.book_choices where title_en = 'Two')), 2,
  'the host sees the counts throughout'
);
select throws_ok(
  $$ delete from programmes.book_choices where id = (select id from programmes.book_choices where title_en = 'Three') $$,
  'P0001', 'ballot_has_votes',
  'the books stay once someone has voted'
);

-- Closed: everyone sees the counts, and nobody votes.
select pg_temp.logout();
update programmes.book_ballots
  set created_at = now() - interval '10 days', closes_at = now() - interval '1 day'
  where id = (select id from programmes.book_ballots where title_en = 'December''s book');
select pg_temp.login_anon();
select is(
  (select sum(votes)::int from programmes.ballot_counts((select id from programmes.book_ballots where title_en = 'December''s book'))), 2,
  'a visitor sees the counts once the ballot closes'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000e6002');
select throws_ok(
  $$ update programmes.book_votes set choice_id = (select id from programmes.book_choices where title_en = 'Three') $$,
  '42501', null,
  'no changing a vote after the ballot closes'
);
select pg_temp.logout();
select ok(
  (select count(*) > 0 from core.outbox where kind = 'revalidate' and payload->'tags' ? 'programmes'),
  'a ballot refreshes the cached program page'
);
select ok(
  (select count(*) > 0 from core.activity_log where table_schema = 'programmes' and table_name = 'book_ballots'),
  'ballots are written to the activity log'
);

select * from finish();
rollback;
