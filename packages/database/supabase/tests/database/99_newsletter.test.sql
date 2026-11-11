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

-- The public newsletter: double opt-in rows only apps/api writes.

select plan(24);

select pg_temp.make_user('00000000-0000-0000-0000-00000000b001', 'editor@auib.edu.iq', 'Content Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000b002', 'reader@auib.edu.iq', 'Reader');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000b001', 'media_director');

delete from core.outbox where kind like 'newsletter.%';

-- apps/api (service role) adds a pending subscriber with a token.
insert into content.newsletter_subscribers (email, lang, confirm_token, confirm_sent_at)
values ('friend@example.com', 'ar', repeat('a', 40), now());
select is((select count(*) from core.outbox where kind = 'newsletter.confirm')::integer, 1,
  'A new subscriber gets a confirmation email');

update content.newsletter_subscribers set confirm_token = repeat('b', 40) where email = 'friend@example.com';
select is((select count(*) from core.outbox where kind = 'newsletter.confirm')::integer, 2,
  'A new token sends the confirmation again');

select throws_ok(
  $$update content.newsletter_subscribers set status = 'subscribed' where email = 'friend@example.com'$$,
  '23514', null, 'Nobody is subscribed without confirming'
);
select throws_ok(
  $$insert into content.newsletter_subscribers (email) values ('Friend@Example.com ')$$,
  '23514', null, 'Addresses are stored trimmed and in lower case'
);

update content.newsletter_subscribers
set status = 'subscribed', confirmed_at = now(), confirm_token = null
where email = 'friend@example.com';

-- Readers and members see nothing; content managers see who, never tokens.
select pg_temp.login_anon();
select throws_ok($$select email from content.newsletter_subscribers$$, '42501', null,
  'Anonymous visitors cannot read subscribers');
select throws_ok(
  $$insert into content.newsletter_subscribers (email) values ('bot@example.com')$$,
  '42501', null, 'Anonymous visitors cannot write subscribers (apps/api does)'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000b002');
select is((select count(*) from content.newsletter_subscribers)::integer, 0,
  'A member without mailing.read sees no subscribers');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*) from content.newsletter_subscribers where status = 'subscribed')::integer, 1,
  'Media (mailing.read) sees who is subscribed; the web lead no longer does');
select throws_ok($$select unsubscribe_token from content.newsletter_subscribers$$, '42501', null,
  'Nobody but apps/api reads the tokens');

-- The Sunday Paper, sent by hand (decisions.md, Qirtas): the Managing Editor
-- writes the letter, sends a test to the Editor-in-Chief, then sends it.
select pg_temp.logout();
select pg_temp.make_user('00000000-0000-0000-0000-00000000b0e1', 'me-paper@auib.edu.iq', 'Managing Editor');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000b0e1', 'managing_editor');
insert into content.newsletter_subscribers (email, confirm_token) values ('pending@example.com', repeat('c', 40));
insert into journal.pieces (slug, category, language, title_en, title_ar, status, published_at, contributor_id)
select 'paper-test', 'report', 'en', 'For the paper', 'للصحيفة', 'published', now() - interval '1 day', id
from journal.contributors limit 1;
select ok(not exists (select 1 from cron.job where jobname = 'sal-sunday-paper'),
  'Nothing sends the paper on its own');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b002');
select throws_ok($$ select content.save_sunday_paper('2026-12', 'Dear readers', 'أعزاءنا القرّاء') $$,
  '42501', null, 'Only Qirtas''s editors put the paper together');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b0e1');
select lives_ok($$ select content.save_sunday_paper('2026-12', 'Dear readers', 'أعزاءنا القرّاء') $$,
  'The Managing Editor writes the editor''s letter');
select throws_ok($$ select content.send_sunday_paper('2026-12') $$,
  'P0001', 'test_first', 'and cannot send before the test');
select lives_ok($$ select content.test_sunday_paper('2026-12') $$,
  'The test goes to the Editor-in-Chief');
select pg_temp.logout();
select is((select count(*)::integer from core.outbox where kind = 'sunday_paper.test'), 1,
  'as one job');
select pg_temp.login_as('00000000-0000-0000-0000-00000000b0e1');
select content.save_sunday_paper('2026-12', 'Dear readers, again', 'أعزاءنا القرّاء');
select is((select tested_at from content.sunday_paper_drafts where month = '2026-12'), null,
  'A change to the letter asks for a new test');
select content.test_sunday_paper('2026-12');
select cmp_ok(content.send_sunday_paper('2026-12'), '>=', 1, 'Then the paper goes out');
select pg_temp.logout();
select is(
  (select count(*)::integer from core.outbox where kind = 'sunday_paper.broadcast'), 1,
  'as one Broadcast job, not an email a person');
select is(
  (select count(*)::integer from private.sunday_paper_recipients() r where r.email = 'friend@example.com'), 1,
  'to the confirmed subscriber');
select is(
  (select count(*)::integer from private.sunday_paper_recipients() r where r.email = 'pending@example.com'), 0,
  'not the pending one');
select is(
  (select count(*)::integer from content.sunday_paper_issues where month = '2026-12'), 1,
  'The issue is recorded as sent');
select pg_temp.login_as('00000000-0000-0000-0000-00000000b0e1');
select throws_ok($$ select content.send_sunday_paper('2026-12') $$,
  'P0001', 'already_sent', 'An issue goes out once');
select pg_temp.login_anon();
select is((select count(*)::integer from content.sunday_paper_issues), 1,
  'Visitors read the issues sent');
select throws_ok($$select recipients from content.sunday_paper_issues$$, '42501', null,
  'but not how many it went to');
select pg_temp.logout();

select * from finish();
rollback;
