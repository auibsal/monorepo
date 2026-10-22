-- Hudhud, the Society's Telegram bot (apps/bot).
--
-- • A member links their Telegram account from the Nexus: the Nexus asks for
--   a one-time code (core.telegram_link_code), opens the bot with it, and the
--   bot redeems it. Only a hash of the code is stored; it lasts 15 minutes.
-- • The bot acts for a linked member through core.telegram_* functions that
--   only the service role may call. Each one sets the member's claims for
--   the rest of its own transaction and then calls the same functions the
--   Nexus calls, so RLS and access.has_permission() decide, exactly as for
--   the member. The claims say aal1: roles that need two-step sign-in never
--   count through Telegram.
-- • An officer with settings.manage connects the Society's Telegram group
--   the same way: a code from the Nexus, typed in the group as /setup.
-- • Every ten minutes pg_cron asks the bot to post what is new (events,
--   Waraq pieces, the daily word) to the group's topics. telegram_posts
--   records each post so nothing is posted twice.
--
-- The bot's address is the private setting `platform.bot_url`; it uses the
-- same Vault secret as the API's scheduled jobs (`cron_secret`).

insert into core.settings (key, value, is_public, description) values
  ('platform.bot_url', 'null', false,
    'Base URL of apps/bot, called every ten minutes for the Telegram group posts.'),
  ('telegram.bot_username', 'null', true,
    'The bot''s Telegram username without the @, for the Nexus "Connect Telegram" link.'),
  ('telegram.rules_en', 'null', false,
    'House rules the bot shows with /rules in the group, in English (with the Acceptable Use Policy).'),
  ('telegram.rules_ar', 'null', false,
    'House rules the bot shows with /rules in the group, in Arabic.')
on conflict (key) do nothing;

-- ── Linked accounts ─────────────────────────────────────────────────────────

create table core.telegram_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  telegram_id bigint not null unique check (telegram_id > 0),
  username text check (char_length(username) <= 64),
  -- Copies of the Nexus notices (reminders, RSVPs, Waraq decisions).
  notify boolean not null default true,
  linked_at timestamptz not null default now()
);

comment on table core.telegram_accounts is
  'Members who linked a Telegram account to the bot. One account each.';

alter table core.telegram_accounts enable row level security;

create policy "Members read their own Telegram link"
  on core.telegram_accounts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members unlink their Telegram account"
  on core.telegram_accounts for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Members choose Telegram notices"
  on core.telegram_accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on core.telegram_accounts from anon, authenticated;
grant select, delete on core.telegram_accounts to authenticated;
grant update (notify) on core.telegram_accounts to authenticated;
grant all on core.telegram_accounts to service_role;

-- One-time codes: a member linking an account, or an officer connecting a
-- group. Only the SHA-256 of the code is kept.
create table core.telegram_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  purpose text not null check (purpose in ('account', 'group')),
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);

comment on table core.telegram_codes is
  'Hashes of one-time codes for linking Telegram, valid for 15 minutes.';

create index telegram_codes_user_idx on core.telegram_codes (user_id);

alter table core.telegram_codes enable row level security;
revoke all on core.telegram_codes from anon, authenticated;
grant all on core.telegram_codes to service_role;

create function private.telegram_new_code(code_purpose text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  -- 32 hex characters (122 random bits): fits a Telegram start link.
  code text := replace(gen_random_uuid()::text, '-', '');
begin
  delete from core.telegram_codes c
  where c.user_id = uid and c.purpose = code_purpose;
  insert into core.telegram_codes (code_hash, purpose, user_id)
  values (encode(sha256(convert_to(code, 'utf8')), 'hex'), code_purpose, uid);
  return code;
end;
$$;

revoke all on function private.telegram_new_code(text) from public, anon, authenticated;

-- The member's code for linking their own account.
create function core.telegram_link_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  return private.telegram_new_code('account');
end;
$$;

-- An officer's code for connecting a Telegram group.
create function core.telegram_group_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('settings.manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return private.telegram_new_code('group');
end;
$$;

revoke all on function core.telegram_link_code() from public, anon;
grant execute on function core.telegram_link_code() to authenticated;
revoke all on function core.telegram_group_code() from public, anon;
grant execute on function core.telegram_group_code() to authenticated;

-- Spends a code: the member it belongs to, or null when it is unknown,
-- expired or for another purpose.
create function private.telegram_spend_code(code text, code_purpose text)
returns uuid
language sql
volatile
security definer
set search_path = ''
as $$
  delete from core.telegram_codes c
  where c.code_hash = encode(sha256(convert_to(telegram_spend_code.code, 'utf8')), 'hex')
    and c.purpose = code_purpose
    and c.expires_at > now()
  returning c.user_id;
$$;

revoke all on function private.telegram_spend_code(text, text) from public, anon, authenticated;

-- The bot redeems a link code. A Telegram account moves to the member who
-- links it last; a member keeps one Telegram account.
create function core.telegram_redeem_link(
  code text,
  telegram_id bigint,
  username text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := private.telegram_spend_code(code, 'account');
begin
  if uid is null then
    return null;
  end if;
  delete from core.telegram_accounts a
  where a.telegram_id = telegram_redeem_link.telegram_id or a.user_id = uid;
  insert into core.telegram_accounts (user_id, telegram_id, username)
  values (uid, telegram_redeem_link.telegram_id, left(telegram_redeem_link.username, 64));
  return uid;
end;
$$;

-- ── Acting for a linked member ──────────────────────────────────────────────

-- Sets the linked member's claims until the end of the current transaction
-- and returns their id, or null when the Telegram account is not linked.
create function private.telegram_become(telegram_id bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  select a.user_id into uid from core.telegram_accounts a
  where a.telegram_id = telegram_become.telegram_id;
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('request.jwt.claim.sub', '', true);
    return null;
  end if;
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  return uid;
end;
$$;

revoke all on function private.telegram_become(bigint) from public, anon, authenticated;

-- Who the Telegram account belongs to, or null.
create function core.telegram_whoami(telegram_id bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := private.telegram_become(telegram_id);
begin
  if uid is null then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'user_id', p.id,
      'name_en', p.full_name_en,
      'name_ar', p.full_name_ar,
      'locale', p.locale,
      'member', membership.is_member(),
      'notify', a.notify
    )
    from core.profiles p
    join core.telegram_accounts a on a.user_id = p.id
    where p.id = uid
  );
end;
$$;

-- Upcoming events the account may see (members-only ones once linked to a
-- member), with the member's place on each: confirmed, waitlisted or null.
create function core.telegram_events(
  telegram_id bigint,
  event_id uuid default null,
  max_rows integer default 6
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := private.telegram_become(telegram_id);
begin
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.starts_at)
    from (
      select e.id, e.slug, e.title_en, e.title_ar, e.summary_en, e.summary_ar,
        e.venue_en, e.venue_ar, e.starts_at, e.ends_at, e.members_only,
        e.capacity, e.rsvp_enabled,
        events.confirmed_count(e.id) as confirmed,
        case
          when uid is null then null
          when exists (select 1 from events.rsvps r where r.event_id = e.id
            and r.user_id = uid and r.status = 'confirmed') then 'confirmed'
          when exists (select 1 from events.waitlist w where w.event_id = e.id
            and w.user_id = uid and w.status = 'waiting') then 'waitlisted'
        end as mine
      from events.events e
      where e.status = 'published'
        and coalesce(e.ends_at, e.starts_at) > now()
        and (telegram_events.event_id is null or e.id = telegram_events.event_id)
        and private.can_see_event(e.status, e.members_only, e.programme_id)
      order by e.starts_at
      limit least(greatest(max_rows, 1), 20)
    ) x
  ), '[]'::jsonb);
end;
$$;

create function core.telegram_rsvp(telegram_id bigint, event_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if private.telegram_become(telegram_id) is null then
    raise exception 'Link your account first' using errcode = '42501';
  end if;
  return events.rsvp(event_id);
end;
$$;

create function core.telegram_cancel_rsvp(telegram_id bigint, event_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if private.telegram_become(telegram_id) is null then
    raise exception 'Link your account first' using errcode = '42501';
  end if;
  perform events.cancel_rsvp(event_id);
end;
$$;

-- ── The Society's groups ────────────────────────────────────────────────────

create table core.telegram_groups (
  chat_id bigint primary key check (chat_id < 0),
  title text check (char_length(title) <= 255),
  -- Language of the bot's posts: English, Arabic, or both in one post.
  lang text not null default 'both' check (lang in ('en', 'ar', 'both')),
  -- Join requests: approve everyone, ask for a tap first, or members only.
  join_policy text not null default 'verify'
    check (join_policy in ('open', 'verify', 'members')),
  -- Forum topic (message_thread_id) per purpose: welcome, announcements,
  -- events, waraq, games, log.
  topics jsonb not null default '{}' check (jsonb_typeof(topics) = 'object'),
  registered_by uuid references auth.users (id) on delete set null,
  registered_at timestamptz not null default now()
);

comment on table core.telegram_groups is
  'Telegram groups connected to the bot by an officer, with their topics.';

-- People in a connected group the bot has seen join: for the newcomer link
-- rule and warnings. Removed when they leave.
create table core.telegram_members (
  chat_id bigint not null references core.telegram_groups (chat_id) on delete cascade,
  telegram_id bigint not null check (telegram_id > 0),
  joined_at timestamptz not null default now(),
  verified_at timestamptz,
  warnings smallint not null default 0 check (warnings between 0 and 10),
  primary key (chat_id, telegram_id)
);

comment on table core.telegram_members is
  'Members of a connected Telegram group: join time and warnings only.';

-- What the bot has posted to each group, so nothing goes twice.
create table core.telegram_posts (
  chat_id bigint not null references core.telegram_groups (chat_id) on delete cascade,
  kind text not null check (kind in ('event', 'event_soon', 'piece', 'word')),
  ref text not null check (char_length(ref) <= 100),
  message_id integer,
  posted_at timestamptz not null default now(),
  primary key (chat_id, kind, ref)
);

comment on table core.telegram_posts is
  'Posts the bot made to a group (one per event, piece or day).';

-- The daily word, played in a private chat with the bot.
create table core.telegram_word_plays (
  telegram_id bigint not null check (telegram_id > 0),
  day integer not null,
  lang text not null check (lang in ('en', 'ar')),
  guesses text[] not null default '{}' check (cardinality(guesses) <= 6),
  created_at timestamptz not null default now(),
  primary key (telegram_id, day, lang)
);

comment on table core.telegram_word_plays is
  'Guesses at the daily word in Telegram. Kept for a week.';

alter table core.telegram_groups enable row level security;
alter table core.telegram_members enable row level security;
alter table core.telegram_posts enable row level security;
alter table core.telegram_word_plays enable row level security;

-- The bot (service role) is the only reader and writer.
revoke all on core.telegram_groups, core.telegram_members, core.telegram_posts,
  core.telegram_word_plays from anon, authenticated;
grant all on core.telegram_groups, core.telegram_members, core.telegram_posts,
  core.telegram_word_plays to service_role;

-- The bot redeems a group code typed as /setup in the group.
create function core.telegram_register_group(code text, chat_id bigint, title text default null)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := private.telegram_spend_code(code, 'group');
begin
  if uid is null then
    return false;
  end if;
  insert into core.telegram_groups as g (chat_id, title, registered_by)
  values (telegram_register_group.chat_id, left(telegram_register_group.title, 255), uid)
  on conflict on constraint telegram_groups_pkey do update
    set title = excluded.title, registered_by = excluded.registered_by,
        registered_at = now();
  return true;
end;
$$;

revoke all on function core.telegram_redeem_link(text, bigint, text) from public, anon, authenticated;
revoke all on function core.telegram_whoami(bigint) from public, anon, authenticated;
revoke all on function core.telegram_events(bigint, uuid, integer) from public, anon, authenticated;
revoke all on function core.telegram_rsvp(bigint, uuid) from public, anon, authenticated;
revoke all on function core.telegram_cancel_rsvp(bigint, uuid) from public, anon, authenticated;
revoke all on function core.telegram_register_group(text, bigint, text) from public, anon, authenticated;
grant execute on function core.telegram_redeem_link(text, bigint, text) to service_role;
grant execute on function core.telegram_whoami(bigint) to service_role;
grant execute on function core.telegram_events(bigint, uuid, integer) to service_role;
grant execute on function core.telegram_rsvp(bigint, uuid) to service_role;
grant execute on function core.telegram_cancel_rsvp(bigint, uuid) to service_role;
grant execute on function core.telegram_register_group(text, bigint, text) to service_role;

-- Third-party apps (Sign in with SAL) never reach these tables.
create policy "Third-party apps reach only their areas"
  on core.telegram_accounts as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Third-party apps reach only their areas"
  on core.telegram_codes as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Third-party apps reach only their areas"
  on core.telegram_groups as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Third-party apps reach only their areas"
  on core.telegram_members as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Third-party apps reach only their areas"
  on core.telegram_posts as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Third-party apps reach only their areas"
  on core.telegram_word_plays as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

-- ── Schedules ───────────────────────────────────────────────────────────────

-- POSTs JSON to apps/bot with the cron bearer token, like private.call_api.
create function private.call_bot(path text, body jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := private.setting('platform.bot_url') #>> '{}';
  token text := private.vault_secret('cron_secret');
begin
  if base is null or base = '' or token is null then
    return null;
  end if;
  return net.http_post(
    url := rtrim(base, '/') || path,
    body := body,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || token
    ),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.call_bot(text, jsonb) from public, anon, authenticated;

select cron.schedule('sal-telegram-posts', '*/10 * * * *',
  $$ select private.call_bot('/api/cron', '{}'::jsonb) $$);
select cron.schedule('sal-telegram-tidy', '25 3 * * *', $$
  delete from core.telegram_codes where expires_at < now();
  delete from core.telegram_word_plays where created_at < now() - interval '7 days';
  delete from core.telegram_posts where posted_at < now() - interval '90 days';
$$);
