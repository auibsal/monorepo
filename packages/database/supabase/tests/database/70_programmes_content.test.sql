-- Programs and content: Six Words, removal requests, published-only
-- news, pieces and search, private settings, the activity log.
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

select plan(18);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'writer@auib.edu.iq', 'Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'shy@auib.edu.iq', 'Shy Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000b1', 'guest@gmail.com', 'Guest');

-- ── Six Words (only from the Typewriter Tour) ───────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ insert into programmes.six_words (text, language) values ('The paper waited for the pen', 'en') $$,
  '42501', null, 'Members do not write six words on the site'
);
select throws_ok(
  $$ select programmes.record_six_words('The paper waited for the pen', 'en') $$,
  '42501', null, 'nor transcribe Tour cards'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select throws_ok(
  $$ select programmes.record_six_words('Only five words are here', 'en') $$,
  '23514', null, 'A Six Words piece has exactly six words'
);
select lives_ok(
  $$ select programmes.record_six_words('The paper waited for the pen', 'en') $$,
  'Whoever runs the Tour transcribes a card'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(
  $$ select programmes.record_six_words('Guests cannot write in the book', 'en') $$,
  '42501', null, 'Guests transcribe nothing'
);

select pg_temp.login_anon();
select is((select count(*) from programmes.six_words_wall())::integer, 1, 'A transcribed card is on the wall');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ select programmes.moderate_six_words((select id from programmes.six_words limit 1), false) $$,
  '42501', null, 'Members cannot moderate'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select lives_ok(
  $$ select programmes.moderate_six_words(id, false) from programmes.six_words $$,
  'A programmes.manage holder can take a card down'
);

select pg_temp.login_anon();
select is((select count(*) from programmes.six_words_wall())::integer, 0, 'and it leaves the wall');

-- ── Removal requests ────────────────────────────────────────────────────────

select throws_ok(
  $$ insert into programmes.removal_requests (requester_name, requester_email, details)
     values ('A', 'a@example.com', 'Please remove') $$,
  '42501', null, 'The public cannot write removal requests directly (they go through apps/api)'
);

select pg_temp.logout();
insert into programmes.removal_requests (requester_name, requester_email, details, programme_id)
values ('A', 'a@example.com', 'Please remove the clip at 2:10',
  (select id from core.programmes where slug = 'next-stop'));
select ok(
  (select due_at = created_at + interval '24 hours' from programmes.removal_requests),
  'A removal request starts a 24-hour clock'
);
select ok(exists (select 1 from core.outbox where kind = 'programmes.removal_requested'),
  'A removal request emails the programme leads');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from programmes.removal_requests)::integer, 0, 'Members cannot read removal requests');

-- ── Content and settings ────────────────────────────────────────────────────

select pg_temp.logout();
select hasnt_table('content', 'news_posts', 'The old news table is gone (Waraq''s News desk has news)');

select pg_temp.login_anon();
select is((select count(*) from content.search('Night') where kind = 'news')::integer, 0,
  'Search no longer lists the old news posts (Waraq''s News desk has them)');
select is((select count(*) from core.settings where key = 'auib.calendar_url')::integer, 0,
  'Private settings are hidden from visitors');
select is((select value #>> '{}' from core.settings where key = 'journal.name_en'), 'Qirtas',
  'The journal name is a public setting');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from core.activity_log)::integer, 0, 'Members cannot read the activity log');

select * from finish();
rollback;
