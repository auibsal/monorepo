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

-- The public newsletter: double opt-in rows only apps/api writes.

select plan(14);

select pg_temp.make_user('00000000-0000-0000-0000-00000000b001', 'editor@auib.edu.iq', 'Content Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000b002', 'reader@auib.edu.iq', 'Reader');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000b001', 'tech_admin');

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
  'A member without content.manage sees no subscribers');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b001');
select is((select count(*) from content.newsletter_subscribers where status = 'subscribed')::integer, 1,
  'A content manager sees who is subscribed');
select throws_ok($$select unsubscribe_token from content.newsletter_subscribers$$, '42501', null,
  'Nobody but apps/api reads the tokens');

-- The Sunday Paper, monthly on the first Sunday, goes to confirmed
-- subscribers (and members who receive email), when there is news.
select pg_temp.logout();
insert into content.newsletter_subscribers (email, confirm_token) values ('pending@example.com', repeat('c', 40));
insert into journal.pieces (slug, category, language, title_en, title_ar, status, published_at, contributor_id)
select 'paper-test', 'report', 'en', 'For the paper', 'للصحيفة', 'published', now() - interval '1 day', id
from journal.contributors limit 1;
select is(private.queue_sunday_paper(date '2026-11-08'), 0,
  'Nothing goes out on the second Sunday');
select is(private.queue_sunday_paper(date '2026-11-02'), 0,
  'nor on a Monday');
select is(
  (select count(*)::integer from core.outbox where kind = 'newsletter.monthly'), 0,
  'so nothing is queued');
select cmp_ok(private.queue_sunday_paper(date '2026-11-01'), '>=', 1,
  'On the first Sunday the paper goes out');
select is(
  (select count(*)::integer from core.outbox where kind = 'newsletter.monthly'), 1,
  'to the one confirmed subscriber, not the pending one');

select * from finish();
rollback;
