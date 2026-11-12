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

-- Revise and resend (decisions.md, Qirtas): once, by the section editor;
-- back to the writer with the note; the same SUB number; back to that
-- editor in selection, not read blind again.

select plan(19);

update journal.calls set desks = enum_range(null::journal.desk) where issue_id is null;

select pg_temp.make_user('00000000-0000-0000-0000-00000000ae11', 'news@auib.edu.iq', 'News Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ae12', 'letters@auib.edu.iq', 'Letters Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'reporter@auib.edu.iq', 'Sara Reporter');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'poet@auib.edu.iq', 'Omar Poet');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'other@auib.edu.iq', 'Other Member');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ae11', 'news_editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ae12', 'letters_editor');

insert into membership.pledges (user_id, pledge_type, version)
select u, t, '1'
from unnest(array[
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a3'
]::uuid[]) u, unnest(enum_range(null::membership.pledge_type)) t;

insert into journal.issues (id, volume, number, slug, title_en, title_ar, status, publish_at) values
  ('1a000000-0000-0000-0000-0000000000f7', 98, 7, 'edition-revise', 'Edition', 'الإصدار',
    'scheduled', now() + interval '60 days');
insert into journal.calls (id, issue_id, title_en, title_ar, opens_at, closes_at, is_published) values
  ('ca000000-0000-0000-0000-0000000000f7', '1a000000-0000-0000-0000-0000000000f7',
    'Edition', 'الإصدار', now() - interval '1 day', now() + interval '30 days', true);

-- ── Named work: the News desk ───────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
insert into journal.submissions (category, language, title, deck, body_html, human_authorship_confirmed)
values ('report', 'en', 'Book drive', 'Second Chapter collected books.', '<p>First draft</p>', true);
select pg_temp.logout();
create function pg_temp.news_sub() returns uuid language sql security definer as $$
  select id from journal.submissions where title like 'Book drive%';
$$;
grant execute on function pg_temp.news_sub() to public;
update journal.submissions set call_id = null where id = pg_temp.news_sub();
create function pg_temp.news_number() returns text language sql security definer as $$
  select reference from journal.submissions where id = pg_temp.news_sub();
$$;
grant execute on function pg_temp.news_number() to public;
create temp table before_number as select pg_temp.news_number() as n;
grant select on before_number to public;

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select journal.transition_submission(pg_temp.news_sub(), 'intake_check');
select journal.transition_submission(pg_temp.news_sub(), 'in_review');

select throws_ok(
  $$ select journal.decide_named(pg_temp.news_sub(), 'revise', '  ') $$,
  '22023', 'A decision needs its reason', 'A revision needs its note'
);
select lives_ok(
  $$ select journal.decide_named(pg_temp.news_sub(), 'revise', 'Name the three donors.') $$,
  'The section editor asks for a revision'
);
select is((select status from journal.submissions where id = pg_temp.news_sub()),
  'intake_check'::journal.submission_status, 'The work goes back to the writer');
select is((select revision_requested_at is not null from journal.desk_queue()
  where submission_id = pg_temp.news_sub()), true, 'The queue shows the request');
select throws_ok(
  $$ select journal.transition_submission(pg_temp.news_sub(), 'in_review') $$,
  '22023', null, 'Revised work is not sent to the readers'
);
select pg_temp.logout();
select ok(exists (select 1 from core.outbox where kind = 'qirtas.decision'
  and payload->>'decision' = 'revise'
  and payload->>'user_id' = '00000000-0000-0000-0000-0000000000a1'),
  'The writer hears, with the note');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  $$ select journal.resend_revision(pg_temp.news_sub()) $$,
  'P0002', null, 'Only the writer sends the revision'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ update journal.submissions set body_html = '<p>Second draft</p>' where id = pg_temp.news_sub() $$,
  'The writer revises the work on their page'
);
select lives_ok($$ select journal.resend_revision(pg_temp.news_sub()) $$,
  'The writer sends it back');
select throws_ok(
  $$ select journal.resend_revision(pg_temp.news_sub()) $$,
  '22023', null, 'A revision is sent once'
);
select pg_temp.logout();
select is((select status from journal.submissions where id = pg_temp.news_sub()),
  'selection'::journal.submission_status, 'It is back with the editor, in selection');
select is(pg_temp.news_number(), (select n from before_number), 'It keeps its number');
select ok(exists (select 1 from core.outbox where kind = 'qirtas.revision_resent'
  and payload->>'user_id' = '00000000-0000-0000-0000-00000000ae11'),
  'The editor who asked hears it is back');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select throws_ok(
  $$ select journal.decide_named(pg_temp.news_sub(), 'revise', 'Once more.') $$,
  '22023', 'A revision is asked for once', 'A revision is asked for once'
);
select lives_ok(
  $$ select journal.decide_named(pg_temp.news_sub(), 'accept', 'Now complete') $$,
  'The editor then decides'
);

-- ── Edition work: blind, the Letters desk ───────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
insert into journal.submissions (call_id, category, language, title, body_html, pen_name,
  human_authorship_confirmed, first_publication_confirmed)
values ('ca000000-0000-0000-0000-0000000000f7', 'poetry', 'en', 'Night River', '<p>Water</p>',
  'The Quiet One', true, true);
select pg_temp.logout();

-- Read and in selection (the readers' part is tested elsewhere).
select private.ensure_blind_entry(id) from journal.submissions where title = 'Night River';
select private.set_submission_status(id, 'intake_check') from journal.submissions where title = 'Night River';
select private.set_submission_status(id, 'in_review') from journal.submissions where title = 'Night River';
select private.set_submission_status(id, 'selection') from journal.submissions where title = 'Night River';
create function pg_temp.poem_entry() returns uuid language sql security definer as $$
  select k.blind_entry_id from journal.blind_keys k
  join journal.submissions s on s.id = k.submission_id where s.title = 'Night River';
$$;
create function pg_temp.poem_sub() returns uuid language sql security definer as $$
  select id from journal.submissions where title = 'Night River';
$$;
grant execute on function pg_temp.poem_entry(), pg_temp.poem_sub() to public;

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae11');
select throws_ok(
  $$ select journal.decide(pg_temp.poem_entry(), 'revise', 'Tighten the end.') $$,
  '42501', null, 'Another section''s editor cannot ask'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000ae12');
select lives_ok(
  $$ select journal.decide(pg_temp.poem_entry(), 'revise', 'Tighten the end.') $$,
  'The Letters Editor asks for a revision, blind'
);
select is((select revision_requested_at is not null from journal.blind_entries
  where id = pg_temp.poem_entry()), true, 'The blind board shows the request');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
update journal.submissions set body_html = '<p>Still water</p>' where id = pg_temp.poem_sub();
select journal.resend_revision(pg_temp.poem_sub());
select pg_temp.logout();
select is((select body_html from journal.blind_entries where id = pg_temp.poem_entry()),
  '<p>Still water</p>', 'The editor reads the revision blind, without a second reading');

select * from finish();
rollback;
