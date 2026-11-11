-- What the Society sends (decisions.md, Channels and email; Qirtas):
-- one audience for every bulk email, with two topics a reader leaves
-- separately, "The Sunday Paper" (paper) and "Society news and events"
-- (news).
--   - Members are on both topics from sign-up (an opt-out box); guests
--     only if they tick it; the public chooses its topics at /sunday-paper
--     by double opt-in; the Tour writers and fair sign-ups who agreed in
--     person, with their source.
--   - Bounced, complained and unsubscribed addresses are never added back.
--   - Resend holds only the email, first name, language and topics; the
--     source and the stop stay here, reported as counts only.
--   - Announcements: one email a week at most; anything else is posted to
--     "From the Society" only, or waits for the Sunday Paper.

-- ── The topics, for people with an account ─────────────────────────────────

alter table core.profiles
  add column mail_paper boolean not null default false,
  add column mail_news boolean not null default false;

comment on column core.profiles.mail_paper is
  'On "The Sunday Paper" topic. Members from sign-up unless they untick the box; guests only if they tick it.';
comment on column core.profiles.mail_news is
  'On "Society news and events" (the announcements). Members from sign-up unless they untick the box; guests only if they tick it.';

-- Members who kept the optional emails on were on the Sunday Paper: both
-- topics now. Guests start off both.
update core.profiles p
set mail_paper = p.notify_email, mail_news = p.notify_email
where private.is_member(p.id);

-- The choice made at sign-up (the user metadata's "mailing"): members get
-- the box ticked, guests unticked; a missing answer is no.
create function private.mailing_choice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  choice text;
begin
  select u.raw_user_meta_data ->> 'mailing' into choice
  from auth.users u where u.id = new.id;
  if choice = 'true' then
    new.mail_paper := true;
    new.mail_news := true;
  end if;
  return new;
end;
$$;

revoke all on function private.mailing_choice() from public, anon, authenticated;

create trigger mailing_choice before insert on core.profiles
  for each row execute function private.mailing_choice();

-- ── The public's topics, source and stop ────────────────────────────────────

alter table content.newsletter_subscribers
  add column paper boolean not null default true,
  add column news boolean not null default false,
  add column source text not null default 'public'
    check (source in ('public', 'tour_2026', 'fair_2026'));

alter table content.newsletter_subscribers
  add constraint newsletter_subscribers_a_topic check (status <> 'subscribed' or paper or news);

comment on column content.newsletter_subscribers.source is
  'How the address came: public (double opt-in at /sunday-paper), or the spring 2026 Tour or the fall 2026 fair, agreed in person and recorded on the invitation list. Reported as counts only.';
comment on column content.newsletter_subscribers.paper is 'On "The Sunday Paper".';
comment on column content.newsletter_subscribers.news is 'On "Society news and events".';

-- The writers who agreed in person (decisions.md, Channels and email): the
-- invitation list is the consent record. Each address is added once, on
-- both topics, unless it already has an account (which decides for
-- itself), is already listed (and so may have left), or has bounced or
-- complained.
create function private.mailing_from_invitations(list text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer;
  list_source text := case when list like 'fair%' then 'fair_2026' else 'tour_2026' end;
begin
  with fresh as (
    insert into content.newsletter_subscribers (email, lang, status, confirmed_at, paper, news, source)
    select i.email, 'en', 'subscribed', coalesce(i.sent_at, now()), true, true, list_source
    from membership.invitations i
    where i.source = list
      and not exists (select 1 from auth.users u where lower(u.email) = i.email)
      and not exists (select 1 from core.email_suppressions e where e.email = i.email)
    on conflict (email) do nothing
    returning 1
  )
  select count(*) into added from fresh;
  return added;
end;
$$;

revoke all on function private.mailing_from_invitations(text) from public, anon, authenticated;
grant execute on function private.mailing_from_invitations(text) to service_role;

-- The spring 2026 Tour's writers, invited on Nov 7.
select private.mailing_from_invitations(l.source)
from membership.invitation_lists l
where l.sent_at is not null and l.source like 'tour_2026%';

-- A list sent later (the fall fair) joins the same way when it goes.
create function private.invitation_list_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sent_at is not null and old.sent_at is null then
    perform private.mailing_from_invitations(new.source);
  end if;
  return new;
end;
$$;

revoke all on function private.invitation_list_sent() from public, anon, authenticated;

create trigger invitation_list_sent after update of sent_at on membership.invitation_lists
  for each row execute function private.invitation_list_sent();

-- ── Who gets a bulk email ───────────────────────────────────────────────────

-- The first name an email greets: the first word of the name, keeping
-- «عبد …», «أبو …» (and Abd/Abu/Abdul/Abdel/Al/El) with the word after.
create function private.greeting_name(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when w[1] is null then null
    when lower(w[1]) in ('عبد', 'أبو', 'ابو', 'abd', 'abu', 'abdul', 'abdel', 'al', 'el')
      and w[2] is not null then w[1] || ' ' || w[2]
    else w[1]
  end
  from (select regexp_split_to_array(btrim(coalesce(name, '')), '\s+') as w) words
  where btrim(coalesce(name, '')) <> '';
$$;

-- Everyone on a topic, in their language: people with an account by their
-- own choice (an account always decides for itself), then the public's
-- confirmed addresses; never a suppressed one.
create function private.mailing_recipients(topic text)
returns table (email text, lang text, first_name text, user_id uuid, token text)
language sql
stable
security definer
set search_path = ''
as $$
  select x.email, x.lang, x.first_name, x.user_id, x.token
  from (
    select lower(u.email) as email,
      case when pr.locale = 'ar' then 'ar' else 'en' end as lang,
      private.greeting_name(case when pr.locale = 'ar'
        then coalesce(nullif(pr.full_name_ar, ''), pr.full_name_en)
        else pr.full_name_en end) as first_name,
      pr.id as user_id, null::text as token
    from core.profiles pr
    join auth.users u on u.id = pr.id
    where u.email is not null
      and case mailing_recipients.topic when 'paper' then pr.mail_paper else pr.mail_news end
      and (private.is_member(pr.id) or private.is_guest(pr.id))
    union all
    select s.email, case when s.lang = 'ar' then 'ar' else 'en' end, null, null, s.unsubscribe_token
    from content.newsletter_subscribers s
    where s.status = 'subscribed'
      and case mailing_recipients.topic when 'paper' then s.paper else s.news end
      and not exists (select 1 from auth.users u where lower(u.email) = s.email)
  ) x
  where mailing_recipients.topic in ('paper', 'news')
    and not exists (select 1 from core.email_suppressions e where e.email = x.email);
$$;

revoke all on function private.mailing_recipients(text) from public, anon, authenticated;
grant execute on function private.mailing_recipients(text) to service_role;

create function core.mailing_recipients(topic text)
returns table (email text, lang text, first_name text, user_id uuid, token text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.mailing_recipients(topic) $$;

revoke all on function core.mailing_recipients(text) from public, anon, authenticated;
grant execute on function core.mailing_recipients(text) to service_role;

comment on function core.mailing_recipients(text) is
  'Everyone on a topic ("paper" or "news"), with their language and greeting name: the outbox only (service_role).';

-- The Sunday Paper's readers are its topic.
create or replace function private.sunday_paper_recipients()
returns table (email text, lang text, user_id uuid, subscriber_id uuid, token text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.email, r.lang, r.user_id, null::uuid, r.token
  from private.mailing_recipients('paper') r;
$$;

-- ── The counts, for Media → Channels ────────────────────────────────────────

-- Each topic by language and source, with no names (decisions.md:
-- Channels and email). Who has stopped is counted too.
create function private.mailing_counts()
returns table (topic text, lang text, source text, readers integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    access.has_permission_anywhere('mailing.read')
    or access.has_permission('settings.manage')
    or access.has_permission('members.manage')
    or access.has_permission('content.manage')
  ) then
    raise exception 'Media sees the counts' using errcode = '42501';
  end if;
  return query
  select t.topic, r.lang,
    coalesce(s.source, case when private.is_member(r.user_id) then 'member' else 'guest' end),
    count(*)::integer
  from (values ('paper'), ('news')) t (topic)
  cross join lateral private.mailing_recipients(t.topic) r
  left join content.newsletter_subscribers s on s.unsubscribe_token = r.token
  group by 1, 2, 3
  union all
  select 'stopped', s.lang, s.source, count(*)::integer
  from content.newsletter_subscribers s
  where s.status = 'unsubscribed'
  group by 2, 3
  union all
  select 'suppressed', null, null, count(*)::integer
  from core.email_suppressions;
end;
$$;

create function content.mailing_counts()
returns table (topic text, lang text, source text, readers integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.mailing_counts() $$;

revoke all on function private.mailing_counts() from public, anon;
revoke all on function content.mailing_counts() from public, anon;
grant execute on function private.mailing_counts() to authenticated, service_role;
grant execute on function content.mailing_counts() to authenticated;

comment on function content.mailing_counts() is
  'Media → Channels: each topic''s readers by language and source, those who stopped and the suppressed addresses; counts only.';

-- ── A member's own topics ───────────────────────────────────────────────────

create function private.set_my_topics(paper boolean, news boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update core.profiles p
  set mail_paper = set_my_topics.paper, mail_news = set_my_topics.news
  where p.id = (select auth.uid());
$$;

create function core.set_my_topics(paper boolean, news boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_my_topics(paper, news) $$;

revoke all on function private.set_my_topics(boolean, boolean) from public, anon;
revoke all on function core.set_my_topics(boolean, boolean) from public, anon;
grant execute on function private.set_my_topics(boolean, boolean) to authenticated, service_role;
grant execute on function core.set_my_topics(boolean, boolean) to authenticated;

comment on function core.set_my_topics(boolean, boolean) is
  'The caller''s mailing topics: The Sunday Paper and Society news and events.';

create function private.my_topics()
returns table (paper boolean, news boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.mail_paper, p.mail_news from core.profiles p where p.id = (select auth.uid());
$$;

create function core.my_topics()
returns table (paper boolean, news boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_topics() $$;

revoke all on function private.my_topics() from public, anon;
revoke all on function core.my_topics() from public, anon;
grant execute on function private.my_topics() to authenticated, service_role;
grant execute on function core.my_topics() to authenticated;

comment on function core.my_topics() is 'The caller''s mailing topics.';

-- ── Announcements: one email a week, the Instagram post ─────────────────────

-- "Post only" is Media's post_notice: the notice goes to "From the
-- Society" with the date it carries and no email, group post or Hudhud
-- notice.
alter table core.announcements add column instagram_done_at timestamptz;

comment on column core.announcements.instagram_done_at is
  'When Media made the Instagram post or story from it.';

-- The President sends (the Vice President while the President is recorded
-- absent: has_permission covers it), after the test in both languages.
-- A second announcement email within seven days is refused; post only
-- (post_notice) still goes.
create or replace function private.send_announcement(id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  a core.announcements;
begin
  if not (access.has_permission('roles.assign') and access.has_permission('governance.manage')) then
    raise exception 'The President sends the announcements' using errcode = '42501';
  end if;
  select * into a from core.announcements n where n.id = send_announcement.id for update;
  if not found or a.sent_at is not null then
    return false;
  end if;
  if a.tested_at is null then
    raise exception 'announcement_untested' using errcode = 'P0001',
      hint = 'Send the test to the President first.';
  end if;
  if exists (
    select 1 from core.announcements o
    where o.id <> a.id and o.sent_at > now() - interval '7 days'
  ) then
    raise exception 'one_email_a_week' using errcode = 'P0001',
      hint = 'One announcement email a week: post it to From the Society only, or wait for the Sunday Paper.';
  end if;
  update core.announcements n set sent_at = now(), shown_at = coalesce(n.shown_at, now())
  where n.id = a.id;
  perform private.enqueue('announcement.broadcast', jsonb_build_object('id', a.id));
  return true;
end;
$$;

-- Media marks the Instagram post made.
create function private.announcement_instagram_done(id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.may_write_notices() then
    raise exception 'Media makes the Instagram post' using errcode = '42501';
  end if;
  update core.announcements a set instagram_done_at = now()
  where a.id = announcement_instagram_done.id and a.shown_at is not null;
end;
$$;

create function core.announcement_instagram_done(id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.announcement_instagram_done(id) $$;

revoke all on function private.announcement_instagram_done(uuid) from public, anon;
revoke all on function core.announcement_instagram_done(uuid) from public, anon;
grant execute on function private.announcement_instagram_done(uuid) to authenticated, service_role;
grant execute on function core.announcement_instagram_done(uuid) to authenticated;

-- ── The two notices of Nov 8 ────────────────────────────────────────────────

-- Posted to "From the Society" only (no email), dated the day the site opened.
insert into core.announcements (title_en, title_ar, body_en, body_ar, link_path, shown_at)
select v.title_en, v.title_ar, v.body_en, v.body_ar, v.link_path, timestamptz '2026-11-08 09:00+03'
from (values
  ('auibsal.org is open', 'افتُتح موقع auibsal.org',
   'The Society’s site is open: join, see what’s on and read Qirtas at auibsal.org.',
   'افتُتح موقع الجمعية: انضم إليها، وتابع «ما يجري»، واقرأ قرطاس على auibsal.org.',
   '/join'),
  ('The Society’s documents are online', 'وثائق الجمعية على الإنترنت',
   'The Constitution, the Bylaws and the Society’s other documents are in the Library.',
   'الدستور والنظام الداخلي وسائر وثائق الجمعية في المكتبة.',
   '/library')
) as v (title_en, title_ar, body_en, body_ar, link_path)
where not exists (select 1 from core.announcements a where a.title_en = v.title_en);
