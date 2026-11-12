-- One notices model across the Society's channels (the owner, Nov 12,
-- 2026; a proposed change to decisions.md, Channels and email): the same
-- topics on email and on Hudhud, each turned on or off per channel, in one
-- place on the site (Settings → Notices) and in Hudhud's /me.
--
-- | Topic                     | Email                     | Hudhud                    |
-- | The Sunday Paper          | profiles.mail_paper       | telegram_accounts.paper   |
-- | Society news and events   | profiles.mail_news        | telegram_accounts.news    |
-- | Reminders                 | profiles.notify_email     | telegram_accounts.reminders |
-- | Your notices (personal)   | always (account, forms)   | telegram_accounts.notify  |
-- | The daily word            | none                      | telegram_accounts.daily_word |
--
-- Reminders go by Hudhud instead of email when Hudhud's are on, so nobody
-- gets the same reminder twice; the Sunday Paper and announcements go on
-- each channel that is on. Account, security and form emails can't be
-- turned off.

alter table core.telegram_accounts
  add column paper boolean not null default true,
  add column news boolean not null default true,
  add column reminders boolean not null default true;

comment on column core.telegram_accounts.paper is 'The Sunday Paper by Hudhud: a link to each issue.';
comment on column core.telegram_accounts.news is 'Society news and events by Hudhud: the announcements.';
comment on column core.telegram_accounts.reminders is 'Reminders by Hudhud, in place of their emails.';
comment on column core.telegram_accounts.notify is 'Your own notices by Hudhud (RSVPs, decisions, applications), copies of their emails.';

grant update (notify, paper, news, reminders, daily_word) on core.telegram_accounts to authenticated;

-- The issues Hudhud brings to members' chats, and to whom it has.
create table core.paper_deliveries (
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  telegram_id bigint not null check (telegram_id > 0),
  sent_at timestamptz not null default now(),
  primary key (month, telegram_id)
);

comment on table core.paper_deliveries is
  'Which linked members Hudhud has brought each Sunday Paper to (Telegram ids only).';

alter table core.paper_deliveries enable row level security;

create policy "No third-party apps" on core.paper_deliveries
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

grant all on core.paper_deliveries to service_role;

-- When each issue went out by email (the site sets it after the broadcast):
-- Hudhud brings it to members' chats for three days after.
alter table content.sunday_paper_drafts add column sent_at timestamptz;

comment on column content.sunday_paper_drafts.sent_at is
  'When the issue went out by email; Hudhud brings it to members'' chats for three days after.';

-- The caller's notices, every topic on every channel, in one row.
create function private.my_notices()
returns table (
  linked boolean,
  paper_email boolean, news_email boolean, reminders_email boolean,
  paper_tg boolean, news_tg boolean, reminders_tg boolean, notices_tg boolean,
  word_tg boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.user_id is not null,
    p.mail_paper, p.mail_news, p.notify_email,
    coalesce(t.paper, false), coalesce(t.news, false),
    coalesce(t.reminders, false), coalesce(t.notify, false),
    coalesce(t.daily_word, false)
  from core.profiles p
  left join core.telegram_accounts t on t.user_id = p.id
  where p.id = (select auth.uid())
$$;

revoke all on function private.my_notices() from public, anon;
grant execute on function private.my_notices() to authenticated;

create function core.my_notices()
returns table (
  linked boolean,
  paper_email boolean, news_email boolean, reminders_email boolean,
  paper_tg boolean, news_tg boolean, reminders_tg boolean, notices_tg boolean,
  word_tg boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_notices() $$;

revoke all on function core.my_notices() from public, anon;
grant execute on function core.my_notices() to authenticated;

-- One topic on one channel, for the caller.
create function private.set_my_notice(topic text, channel text, turn_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if channel = 'email' then
    case topic
      when 'paper' then update core.profiles set mail_paper = turn_on where id = me;
      when 'news' then update core.profiles set mail_news = turn_on where id = me;
      when 'reminders' then update core.profiles set notify_email = turn_on where id = me;
      else raise exception 'unknown_topic' using errcode = '22023';
    end case;
  elsif channel = 'telegram' then
    case topic
      when 'paper' then update core.telegram_accounts set paper = turn_on where user_id = me;
      when 'news' then update core.telegram_accounts set news = turn_on where user_id = me;
      when 'reminders' then update core.telegram_accounts set reminders = turn_on where user_id = me;
      when 'notices' then update core.telegram_accounts set notify = turn_on where user_id = me;
      when 'word' then update core.telegram_accounts set daily_word = turn_on where user_id = me;
      else raise exception 'unknown_topic' using errcode = '22023';
    end case;
  else
    raise exception 'unknown_channel' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.set_my_notice(text, text, boolean) from public, anon;
grant execute on function private.set_my_notice(text, text, boolean) to authenticated;

create function core.set_my_notice(topic text, channel text, turn_on boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_my_notice(topic, channel, turn_on) $$;

revoke all on function core.set_my_notice(text, text, boolean) from public, anon;
grant execute on function core.set_my_notice(text, text, boolean) to authenticated;

comment on function core.set_my_notice(text, text, boolean) is
  'Turns one topic (paper, news, reminders, notices, word) on or off on one channel (email, telegram) for the caller.';

-- Hudhud's new group posts: the Sunday Paper, a live stream, a staff alert.
alter table core.telegram_posts drop constraint telegram_posts_kind_check;
alter table core.telegram_posts add constraint telegram_posts_kind_check
  check (kind = any (array['event', 'event_soon', 'piece', 'word', 'brief',
    'event_summary', 'announcement', 'sunday_note', 'paper', 'stream', 'alert',
    'description']));

-- ── Staff alerts (decisions.md: staff alerts go to the team's topic in the
-- Diwan group and the Diwan's Desk, never by bulk email; urgent ones at
-- once, the rest in one daily digest). Written by the site's own checks
-- (failed jobs, deploys, the database advisors, email complaints, the
-- domain and its certificate); Hudhud posts them. No names, only what
-- happened and where to look.
create table core.staff_alerts (
  id uuid primary key default gen_random_uuid(),
  team text not null check (team in ('council', 'qirtas', 'media', 'events', 'membership', 'partnerships')),
  urgent boolean not null default false,
  text_en text not null check (char_length(text_en) between 1 and 600),
  text_ar text not null check (char_length(text_ar) between 1 and 600),
  link text check (link is null or link ~ '^https://'),
  -- One alert per thing: the same key on the same day is written once.
  dedupe_key text,
  created_at timestamptz not null default now(),
  posted_at timestamptz
);

create unique index staff_alerts_dedupe_idx on core.staff_alerts (dedupe_key) where dedupe_key is not null;
create index staff_alerts_waiting_idx on core.staff_alerts (created_at) where posted_at is null;

comment on table core.staff_alerts is
  'Staff alerts for the Diwan group''s team topics and the Desk: urgent at once, the rest in a daily digest. No names.';

alter table core.staff_alerts enable row level security;

create policy "No third-party apps" on core.staff_alerts
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
-- Whether the caller holds a Society role (private.is_staff, for policies).
create function private.i_am_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_staff((select auth.uid())) $$;

revoke all on function private.i_am_staff() from public, anon;
grant execute on function private.i_am_staff() to authenticated;

create policy "Role holders read staff alerts" on core.staff_alerts
  for select to authenticated
  using ((select private.i_am_staff()));

grant select on core.staff_alerts to authenticated;
grant all on core.staff_alerts to service_role;

-- The database advisors, also for the site's daily check, which posts any
-- finding to the Council's topic (a staff alert).
create or replace function private.advisor_findings()
returns table (check_key text, item text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Settings managers, and the site's own daily check (the secret key).
  if not (private.has_permission('settings.manage')
      or coalesce((select auth.role()) = 'service_role', false)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  -- A table in a SAL schema without row level security.
  return query
  select 'rls_disabled'::text, n.nspname || '.' || c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and not c.relrowsecurity
    and n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content');

  -- An exposed SECURITY DEFINER function a client role may call (0028, 0029).
  return query
  select 'definer_exposed'::text, n.nspname || '.' || p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content')
    and p.prosecdef
    and (has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute'));

  -- A function without a pinned search_path (0011).
  return query
  select 'search_path'::text, n.nspname || '.' || p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content', 'private')
    and p.prokind = 'f'
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}')) c
      where c like 'search_path=%');

  -- Two permissive policies for the same role and action (0006).
  return query
  with expanded as (
    select schemaname, tablename,
      unnest(case when roles = '{public}'
        then array['anon', 'authenticated'] else roles::text[] end) as role,
      unnest(case when cmd = 'ALL'
        then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[cmd] end) as action
    from pg_policies
    where permissive = 'PERMISSIVE'
  )
  select 'multiple_policies'::text,
    schemaname || '.' || tablename || ' ' || role || ' ' || action
  from expanded
  group by schemaname, tablename, role, action
  having count(*) > 1;

  -- A foreign key without an index on its columns (0001).
  return query
  select 'unindexed_foreign_key'::text, c.conrelid::regclass::text || '.' || c.conname
  from pg_constraint c
  join pg_namespace n on n.oid = c.connamespace
  where c.contype = 'f'
    and n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content', 'private')
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey::int2[]);
end;
$$;
