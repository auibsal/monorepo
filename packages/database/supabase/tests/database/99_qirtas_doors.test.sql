-- Qirtas two doors: call alerts, and Six Words only from the Typewriter Tour.
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

select pg_temp.make_user('00000000-0000-0000-0000-0000000060a1', 'writer.one@auib.edu.iq', 'Writer One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000060a2', 'tour.lead@auib.edu.iq', 'Tour Lead');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000060a2', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'typewriter-tour'));

-- Tell me when
select pg_temp.login_as('00000000-0000-0000-0000-0000000060a1');
select lives_ok($$ insert into journal.call_alerts default values $$,
  'A member asks to hear when the next call opens');
select is((select count(*)::integer from journal.call_alerts), 1, 'and sees their own alert');

select pg_temp.logout();
insert into journal.issues (id, volume, number, slug, title_en, title_ar)
values ('1a000000-0000-0000-0000-0000000060c1', 9, 9, 'issue-door', 'Door', 'باب');
insert into journal.calls (id, issue_id, title_en, title_ar, opens_at, closes_at, is_published) values
  ('ca000000-0000-0000-0000-0000000060c1', '1a000000-0000-0000-0000-0000000060c1',
    'Door call', 'نداء الباب', now() - interval '2 hours', now() + interval '30 days', true);
select private.daily_notices();
select ok(
  exists (select 1 from core.outbox o where o.kind = 'journal.call_opened'
    and o.payload->>'user_id' = '00000000-0000-0000-0000-0000000060a1'
    and o.payload->>'call_id' = 'ca000000-0000-0000-0000-0000000060c1'),
  'and is emailed when a call opens'
);

-- The types members send
insert into membership.pledges (user_id, pledge_type, version)
select '00000000-0000-0000-0000-0000000060a1', t, '1'
from unnest(enum_range(null::membership.pledge_type)) t;
select pg_temp.login_as('00000000-0000-0000-0000-0000000060a1');
select lives_ok(
  $$ insert into journal.submissions (call_id, category, language, title, body_html,
       human_authorship_confirmed, first_publication_confirmed)
     values ('ca000000-0000-0000-0000-0000000060c1', 'prose', 'en', 'A story', '<p>Text</p>', true, true) $$,
  'Prose goes to the Edition'
);
select is((select desk from journal.submissions where title = 'A story'), 'letters'::journal.desk,
  'on the Letters desk');
select throws_ok(
  $$ insert into journal.submissions (call_id, category, language, title, body_html,
       human_authorship_confirmed, first_publication_confirmed)
     values ('ca000000-0000-0000-0000-0000000060c1', 'six_words', 'en', 'Six', '<p>a b c d e f</p>', true, true) $$,
  '22023', 'six_words_on_tour', 'Six Words are never sent from the site'
);

-- Six Words from the Tour
select throws_ok(
  $$ insert into programmes.six_words (user_id, text, language)
     values ('00000000-0000-0000-0000-0000000060a1', 'one two three four five six', 'en') $$,
  '42501', null, 'Members no longer write their six words on the site'
);
select throws_ok(
  $$ select programmes.record_six_words('one two three four five six', 'en') $$,
  '42501', null, 'Only those who run the Tour transcribe cards'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000060a2');
create temp table unsigned on commit drop as
  select programmes.record_six_words('ink on paper under the stars', 'en') as id;
grant select on unsigned to public;
select is(
  (select status from programmes.six_words where id = (select id from unsigned)), 'approved',
  'A transcribed card is on the wall at once'
);
select pg_temp.login_anon();
select ok(
  (select author_en is null from programmes.six_words_wall() where id = (select id from unsigned)),
  'unsigned until its writer is found'
);

select pg_temp.logout();
create temp table writer_card on commit drop as
  select code, private.totp(secret, floor(extract(epoch from now()) / 30)::bigint) as live,
    private.totp(secret, floor(extract(epoch from now()) / 30)::bigint - 5) as stale
  from membership.cards where user_id = '00000000-0000-0000-0000-0000000060a1';
grant select on writer_card to public;

select pg_temp.login_as('00000000-0000-0000-0000-0000000060a2');
select throws_ok(
  $$ select programmes.attach_six_words((select id from unsigned),
       (select code from writer_card), (select stale from writer_card)) $$,
  '22023', 'card_not_live', 'A screenshot of a card attaches nothing'
);
select lives_ok(
  $$ select programmes.attach_six_words((select id from unsigned),
       (select code from writer_card), (select live from writer_card)) $$,
  'Scanning the live card attaches the words to their writer'
);
select pg_temp.login_anon();
select is(
  (select author_en from programmes.six_words_wall() where id = (select id from unsigned)),
  'Writer One', 'who is then named on the wall'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000060a2');
select programmes.record_six_words('a second card from the tour', 'en',
  (select code from writer_card), (select live from writer_card));
select is(
  (select count(*)::integer from programmes.six_words where user_id = '00000000-0000-0000-0000-0000000060a1'),
  1, 'A new card replaces the member''s earlier words'
);

select * from finish();
rollback;
