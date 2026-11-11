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

-- The mailing list (decisions.md, Channels and email): one audience, two
-- topics; members on both from sign-up unless they untick the box, guests
-- only if they tick it, the public by double opt-in, the Tour's writers
-- from the invitation list; never a suppressed address; one announcement
-- email a week.

select plan(14);

-- A member who kept the box ticked, a member who unticked it, and a guest
-- who ticked it.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000ae101', 'on-mail@auib.edu.iq', now(),
    '{"full_name_en": "Abdul Rahman Test", "mailing": "true"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000ae102', 'off-mail@auib.edu.iq', now(),
    '{"full_name_en": "Off Test", "mailing": "false"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000ae103', 'guest-mail@example.com', now(),
    '{"full_name_en": "Guest Test", "mailing": "true", "guest": "true"}', 'authenticated', 'authenticated');
insert into membership.memberships (user_id) values
  ('00000000-0000-0000-0000-0000000ae101'), ('00000000-0000-0000-0000-0000000ae102')
on conflict do nothing;
update core.profiles set verified_at = now()
where id in ('00000000-0000-0000-0000-0000000ae101', '00000000-0000-0000-0000-0000000ae102');
insert into membership.guests (user_id) values ('00000000-0000-0000-0000-0000000ae103');

select ok((select mail_paper and mail_news from core.profiles where id = '00000000-0000-0000-0000-0000000ae101'),
  'The box at sign-up puts a member on both topics');
select ok((select not mail_paper and not mail_news from core.profiles where id = '00000000-0000-0000-0000-0000000ae102'),
  'Unticked, neither');

-- The public: a confirmed reader of the paper only, one of the news only,
-- one pending.
insert into content.newsletter_subscribers (email, status, confirmed_at, paper, news) values
  ('paper-only@example.com', 'subscribed', now(), true, false),
  ('news-only@example.com', 'subscribed', now(), false, true),
  ('pending@example.com', 'pending', null, true, true);

select is(
  (select array_agg(email order by email) from private.mailing_recipients('paper')
   where email like any (array['%-mail@%', '%only@example.com', 'pending@%'])),
  array['guest-mail@example.com', 'on-mail@auib.edu.iq', 'paper-only@example.com'],
  'The Sunday Paper goes to the members and guests who chose it and its confirmed readers');
select is(
  (select array_agg(email order by email) from private.mailing_recipients('news')
   where email like any (array['%-mail@%', '%only@example.com', 'pending@%'])),
  array['guest-mail@example.com', 'news-only@example.com', 'on-mail@auib.edu.iq'],
  'Society news and events to those who chose it');
select is((select first_name from private.mailing_recipients('paper') where email = 'on-mail@auib.edu.iq'),
  'Abdul Rahman', 'The greeting keeps a compound first name whole');
select is(private.greeting_name('عبد الله محمد'), 'عبد الله', 'in Arabic too');

-- A bounced address is never sent to, or added back.
insert into core.email_suppressions (email, reason) values ('paper-only@example.com', 'bounced');
select ok(not exists (select 1 from private.mailing_recipients('paper') where email = 'paper-only@example.com'),
  'A suppressed address gets nothing');

-- The Tour's writers who agreed in person.
insert into membership.invitation_lists (source, title_en, title_ar) values ('tour_test', 'Test', 'تجربة');
insert into membership.invitations (email, kind, source) values
  ('writer-one@auib.edu.iq', 'tour', 'tour_test'),
  ('on-mail@auib.edu.iq', 'tour', 'tour_test');
update membership.invitation_lists set sent_at = now() where source = 'tour_test';
select is((select source || ':' || paper::text || ':' || news::text from content.newsletter_subscribers
  where email = 'writer-one@auib.edu.iq'), 'tour_2026:true:true',
  'Sending an invitation list adds its writers, on both topics, with their source');
select ok(not exists (select 1 from content.newsletter_subscribers where email = 'on-mail@auib.edu.iq'),
  'but never someone with an account, who decides for themselves');

-- A member's own topics.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ae101');
select lives_ok($$ select core.set_my_topics(true, false) $$, 'A member leaves one topic');
select is((select array[paper, news] from core.my_topics()), array[true, false], 'and keeps the other');

-- The counts are for Media and those who run the channels.
select throws_ok($$ select * from content.mailing_counts() $$, '42501', null,
  'A member sees no counts');

-- One announcement email a week.
select pg_temp.logout();
insert into core.announcements (title_en, title_ar, body_en, body_ar, tested_at, sent_at, shown_at)
values ('Earlier', 'سابق', 'Earlier.', 'سابق.', now(), now() - interval '2 days', now() - interval '2 days');
insert into core.announcements (id, title_en, title_ar, body_en, body_ar, tested_at)
values ('00000000-0000-0000-0000-0000000ae1a1', 'Next', 'تالٍ', 'Next.', 'تالٍ.', now());
select pg_temp.make_user('00000000-0000-0000-0000-0000000ae1f1', 'pres-mail@auib.edu.iq', 'President');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000ae1f1', 'president');
select pg_temp.login_as('00000000-0000-0000-0000-0000000ae1f1', '{"aal": "aal2"}');
select throws_ok($$ select core.send_announcement('00000000-0000-0000-0000-0000000ae1a1') $$,
  'P0001', 'one_email_a_week', 'A second announcement email within seven days is refused');
select lives_ok($$ select core.post_notice('00000000-0000-0000-0000-0000000ae1a1', now()) $$,
  'but it can still be posted to From the Society');

select * from finish();
rollback;
