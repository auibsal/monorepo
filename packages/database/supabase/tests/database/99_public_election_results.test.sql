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

-- auibsal.org/governance: published elections show who won each office,
-- never the other candidates, the rounds, or an election not yet published.

select plan(5);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e1001', 'winner-er@auib.edu.iq', 'Winner Name');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e1002', 'runner-er@auib.edu.iq', 'Runner Up');

insert into governance.elections (id, title_en, title_ar, status, nominations_open_at, nominations_close_at,
  voting_opens_at, voting_closes_at, eligible_count, notice_given_at) values
  ('00000000-0000-0000-0000-0000000e1e01', 'Spring 2026', 'ربيع ٢٠٢٦', 'published',
    now() - interval '30 days', now() - interval '20 days', now() - interval '20 days', now() - interval '18 days', 40, now() - interval '40 days'),
  ('00000000-0000-0000-0000-0000000e1e02', 'Not yet out', 'لم تُعلن', 'closed',
    now() - interval '10 days', now() - interval '5 days', now() - interval '5 days', now() - interval '3 days', 40, now() - interval '20 days');
insert into governance.positions (id, election_id, role_key, title_en, title_ar, sort) values
  ('00000000-0000-0000-0000-0000000e1b01', '00000000-0000-0000-0000-0000000e1e01', 'president', 'President', 'الرئيس', 1),
  ('00000000-0000-0000-0000-0000000e1b02', '00000000-0000-0000-0000-0000000e1e01', 'treasurer', 'Treasurer', 'أمين الصندوق', 2),
  ('00000000-0000-0000-0000-0000000e1b03', '00000000-0000-0000-0000-0000000e1e02', 'president', 'President', 'الرئيس', 1);
insert into governance.candidates (id, position_id, user_id, status) values
  ('00000000-0000-0000-0000-0000000e1c01', '00000000-0000-0000-0000-0000000e1b01', '00000000-0000-0000-0000-0000000e1001', 'approved'),
  ('00000000-0000-0000-0000-0000000e1c02', '00000000-0000-0000-0000-0000000e1b01', '00000000-0000-0000-0000-0000000e1002', 'approved'),
  ('00000000-0000-0000-0000-0000000e1c03', '00000000-0000-0000-0000-0000000e1b03', '00000000-0000-0000-0000-0000000e1002', 'approved');
insert into governance.election_results (election_id, position_id, rounds, winner_candidate_id, ron_won, ballots_counted) values
  ('00000000-0000-0000-0000-0000000e1e01', '00000000-0000-0000-0000-0000000e1b01', '[{"round":1}]', '00000000-0000-0000-0000-0000000e1c01', false, 30),
  ('00000000-0000-0000-0000-0000000e1e01', '00000000-0000-0000-0000-0000000e1b02', '[{"round":1}]', null, true, 30),
  ('00000000-0000-0000-0000-0000000e1e02', '00000000-0000-0000-0000-0000000e1b03', '[{"round":1}]', '00000000-0000-0000-0000-0000000e1c03', false, 20);

select pg_temp.login_anon();
select results_eq(
  $$select position_title_en, winner_name_en, ron_won, ballots_counted, eligible_count
    from governance.public_election_results()$$,
  $$values ('President'::text, 'Winner Name'::text, false, 30, 40),
           ('Treasurer'::text, null::text, true, 30, 40)$$,
  'Visitors see the outcome of each office in a published election'
);
select is(
  (select count(*) from governance.public_election_results() where election_title_en = 'Not yet out')::integer,
  0, 'An election not yet published stays out'
);
select is(
  (select count(*) from governance.public_election_results() where winner_name_en = 'Runner Up')::integer,
  0, 'Candidates who were not elected are not named'
);
select throws_ok($$select * from governance.election_results$$, '42501', null,
  'Visitors cannot read the results table and its rounds');
select throws_ok($$select * from governance.candidates$$, '42501', null,
  'Visitors cannot read the candidates');

select * from finish();
rollback;
