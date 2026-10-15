-- The public newsletter (owner, Oct 14, 2026: "a public subscription, and
-- maybe the Sunday Paper should be members only"): anyone can sign up on
-- auibsal.org for "The Month in Waraq", a monthly email of the month's
-- published pieces and the coming public events. The Sunday Paper stays a
-- members' email.
--
-- Double opt-in: apps/api writes a pending row with a confirmation token;
-- the email links to auibsal.org/newsletter/confirm, where a button (not
-- the link itself, so mail scanners cannot confirm anyone) sends the token
-- back. Every digest carries an unsubscribe link and a one-click
-- List-Unsubscribe header. Only apps/api (service role) reads or writes
-- the rows; officers with content.manage see who is subscribed, never the
-- tokens.

create table content.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
  lang text not null default 'en' check (lang in ('en', 'ar')),
  status text not null default 'pending' check (status in ('pending', 'subscribed', 'unsubscribed')),
  confirm_token text unique check (char_length(confirm_token) >= 32),
  confirm_sent_at timestamptz,
  unsubscribe_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint newsletter_subscribers_email_key unique (email),
  check (status <> 'subscribed' or confirmed_at is not null)
);

create index newsletter_subscribers_status_idx on content.newsletter_subscribers (status);

alter table content.newsletter_subscribers enable row level security;

create policy "Content managers see who is subscribed"
  on content.newsletter_subscribers for select to authenticated
  using ((select access.has_permission_anywhere('content.manage')));
create policy "Third-party apps reach only their areas"
  on content.newsletter_subscribers as restrictive for all to authenticated
  using ((select private.client_allows('content')))
  with check ((select private.client_allows('content')));

-- Never the tokens: those are for apps/api alone.
grant select (id, email, lang, status, created_at, confirmed_at, unsubscribed_at)
  on content.newsletter_subscribers to authenticated;
grant all on content.newsletter_subscribers to service_role;

-- A new confirmation token sends the confirmation email (through the
-- outbox, so the daily email limit is respected).
create function private.queue_newsletter_confirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' and new.confirm_token is not null
     and (tg_op = 'INSERT' or new.confirm_token is distinct from old.confirm_token) then
    perform private.enqueue('newsletter.confirm', jsonb_build_object('subscriber_id', new.id));
  end if;
  return new;
end;
$$;

revoke all on function private.queue_newsletter_confirm() from public, anon, authenticated;

create trigger queue_confirm after insert or update of confirm_token on content.newsletter_subscribers
  for each row execute function private.queue_newsletter_confirm();

-- The Month in Waraq: on the 1st of each month, one email per subscriber,
-- when the past month had published pieces or a public event is coming.
create function private.queue_newsletter()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - interval '1 month';
  n integer := 0;
  subscriber uuid;
begin
  if not exists (
    select 1 from journal.pieces p
    where p.status = 'published' and p.published_at > since and p.published_at <= now()
  ) and not exists (
    select 1 from events.events e
    where e.status = 'published' and not e.members_only
      and e.starts_at > now() and e.starts_at <= now() + interval '1 month'
  ) then
    return 0;
  end if;
  for subscriber in
    select s.id from content.newsletter_subscribers s where s.status = 'subscribed'
  loop
    perform private.enqueue('newsletter.monthly',
      jsonb_build_object('subscriber_id', subscriber, 'since', since));
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function private.queue_newsletter() from public, anon, authenticated;

-- 06:00 UTC on the 1st is 9:00 AM in Baghdad.
select cron.schedule('sal-newsletter', '0 6 1 * *', $$ select private.queue_newsletter() $$);
