-- The Mutanabbi Prize (decisions.md; migration 20261107000600):
-- shortlists, the members' vote, the count and its checks.
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

select plan(18);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f0a01', 'prize-writer@auib.edu.iq', 'Prize Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f0a02', 'prize-voter@auib.edu.iq', 'Prize Voter');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f0a03', 'prize-eic@auib.edu.iq', 'Prize Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f0a04', 'prize-gs@auib.edu.iq', 'Prize Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f0a05', 'prize-new@auib.edu.iq', 'Prize Newcomer');
insert into membership.memberships (user_id) values
  ('00000000-0000-0000-0000-0000000f0a01'), ('00000000-0000-0000-0000-0000000f0a02'),
  ('00000000-0000-0000-0000-0000000f0a05')
on conflict do nothing;
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f0a03', 'eic');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f0a04', 'general_secretary');
-- The voter has taken part twice this year; the newcomer hasn't.
insert into membership.activity_records (user_id, kind, occurred_at, note) values
  ('00000000-0000-0000-0000-0000000f0a02', 'check_in', now() - interval '1 day', 'A reading'),
  ('00000000-0000-0000-0000-0000000f0a02', 'check_in',
   greatest(private.academic_year_start()::timestamptz + interval '1 day', now() - interval '2 days'), 'A general meeting');

insert into journal.contributors (id, slug, name_en, name_ar, user_id, is_pen_name) values
  ('c0000000-0000-0000-0000-0000000f0c01', 'prize-writer', 'Night Owl', 'بومة الليل', '00000000-0000-0000-0000-0000000f0a01', true);
insert into journal.pieces (id, slug, category, language, title_en, title_ar, status, published_at, contributor_id) values
  ('d0000000-0000-0000-0000-0000000f0d01', 'prize-poem', 'poetry', 'en', 'A Poem', 'قصيدة', 'published',
   now() - interval '3 days', 'c0000000-0000-0000-0000-0000000f0c01'),
  ('d0000000-0000-0000-0000-0000000f0d02', 'prize-draft', 'poetry', 'en', 'A Draft', 'مسودة', 'editing',
   null, 'c0000000-0000-0000-0000-0000000f0c01');

-- The Editor-in-Chief opens a round and shortlists.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0a03');
insert into journal.prize_rounds (id, year, period_from, period_to)
values ('e0000000-0000-0000-0000-0000000f0e01', 2028, current_date - 30, current_date + 30);
select lives_ok(
  $$ insert into journal.prize_entries (id, round_id, category, piece_id)
     values ('f0000000-0000-0000-0000-0000000f0f01', 'e0000000-0000-0000-0000-0000000f0e01', 'qirtas',
       'd0000000-0000-0000-0000-0000000f0d01') $$,
  'Editors shortlist a student Member''s published work'
);
select throws_ok(
  $$ insert into journal.prize_entries (round_id, category, piece_id)
     values ('e0000000-0000-0000-0000-0000000f0e01', 'qirtas', 'd0000000-0000-0000-0000-0000000f0d02') $$,
  '23514', 'not_eligible',
  'An unpublished piece can''t be shortlisted'
);
insert into journal.prize_entries (id, round_id, category, qalam_title, qalam_byline)
values ('f0000000-0000-0000-0000-0000000f0f02', 'e0000000-0000-0000-0000-0000000f0e01', 'qalam',
  'Summer Rain', 'Sara A., Baghdad High');
update journal.prize_entries set judge_score = 80 where id = 'f0000000-0000-0000-0000-0000000f0f01';
update journal.prize_entries set judge_score = 90 where id = 'f0000000-0000-0000-0000-0000000f0f02';

-- Recusal (decisions §5): whoever is connected to a work steps aside.
insert into journal.prize_recusals (entry_id, reason)
values ('f0000000-0000-0000-0000-0000000f0f02', 'Taught the student');
select throws_ok(
  $$ update journal.prize_entries set judge_score = 95 where id = 'f0000000-0000-0000-0000-0000000f0f02' $$,
  '42501', 'recused', 'A recused officer doesn''t score the work'
);
select throws_ok(
  $$ insert into journal.prize_recusals (entry_id, user_id)
     values ('f0000000-0000-0000-0000-0000000f0f01', '00000000-0000-0000-0000-0000000f0a02') $$,
  '42501', null, 'and nobody recuses someone else'
);

-- Members don't read rounds or shortlists before the results.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0a02');
select is((select count(*)::int from journal.prize_entries), 0, 'Members never read the shortlist table');
select is(journal.open_prize_round(), null, 'No round is open before the vote');

-- The vote opens.
select pg_temp.logout();
update journal.prize_rounds
set vote_opens_at = now() - interval '1 hour', vote_closes_at = now() + interval '1 day'
where id = 'e0000000-0000-0000-0000-0000000f0e01';

select pg_temp.login_as('00000000-0000-0000-0000-0000000f0a02');
select is(journal.open_prize_round(), 'e0000000-0000-0000-0000-0000000f0e01'::uuid, 'Members find the open round');
select is(
  (select byline_en from journal.prize_ballot('e0000000-0000-0000-0000-0000000f0e01') where category = 'qalam'),
  null,
  'The ballot hides Qalam students'' names'
);
select lives_ok(
  $$ select journal.cast_prize_vote('f0000000-0000-0000-0000-0000000f0f01') $$,
  'A voting member votes'
);
select throws_ok(
  $$ select journal.cast_prize_vote('f0000000-0000-0000-0000-0000000f0f01') $$,
  '23505', 'You have already voted in this category',
  'once in each category'
);
select ok(
  (select voted from journal.prize_ballot('e0000000-0000-0000-0000-0000000f0e01') where category = 'qirtas'),
  'and the ballot says so'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f0a05');
select throws_ok(
  $$ select journal.cast_prize_vote('f0000000-0000-0000-0000-0000000f0f02') $$,
  '42501', 'Voting members only',
  'A member who isn''t a voting member can''t vote'
);

-- The vote closes; the count is 70% judge, 30% members.
select pg_temp.logout();
update journal.prize_rounds
set vote_opens_at = now() - interval '2 days', vote_closes_at = now() - interval '1 hour', awarded_on = current_date
where id = 'e0000000-0000-0000-0000-0000000f0e01';
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0a03');
select is(
  (select final_score from journal.prize_results('e0000000-0000-0000-0000-0000000f0e01') where category = 'qirtas'),
  86.00::numeric,
  'Final score: 70% of the judge''s 80 and 30% of the members'' 100'
);
select throws_ok(
  $$ update journal.prize_rounds set results_published = true where id = 'e0000000-0000-0000-0000-0000000f0e01' $$,
  '23514', 'count_not_checked',
  'Results publish only once the count is checked'
);
select journal.check_prize_count('e0000000-0000-0000-0000-0000000f0e01');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0a04');
select journal.check_prize_count('e0000000-0000-0000-0000-0000000f0e01');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0a03');
update journal.prize_rounds set results_published = true where id = 'e0000000-0000-0000-0000-0000000f0e01';

select pg_temp.login_anon();
select is(
  (select count(*)::int from journal.prize_results('e0000000-0000-0000-0000-0000000f0e01')),
  2,
  'Once checked and published, anyone reads the results on the award day'
);
select is(
  (select byline_en from journal.prize_results('e0000000-0000-0000-0000-0000000f0e01') where category = 'qalam'),
  'Sara A., Baghdad High',
  'with the Qalam student named'
);
select is(
  (select byline_en from journal.prize_results('e0000000-0000-0000-0000-0000000f0e01') where category = 'qirtas'),
  'Night Owl', 'A pen-name winner shows the pen name'
);
select pg_temp.logout();
update journal.prize_entries set winner_named = true where id = 'f0000000-0000-0000-0000-0000000f0f01';
select pg_temp.login_anon();
select is(
  (select byline_en from journal.prize_results('e0000000-0000-0000-0000-0000000f0e01') where category = 'qirtas'),
  'Prize Writer', 'unless the winner chose to be named'
);

select * from finish();
rollback;
