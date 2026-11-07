-- The Sunday Paper and the one-time invitation go out as Resend Broadcasts
-- (owner, Nov 7, 2026). One email per person counts against the free
-- plan's 100 a day, which sign-in and confirmation emails share; a
-- Broadcast doesn't (the free plan sends to up to 1,000 contacts a month).
--
-- The lists stay here: each send copies the people it goes to into a fresh
-- Resend segment, sends one Broadcast per language and deletes the segment
-- once it has gone. Anyone who unsubscribed through Resend is read back
-- first, so the site's list stays the one record.

-- 1. Each Broadcast's progress (the API routes only).
create table core.broadcasts (
  key text primary key check (char_length(key) <= 80),
  kind text not null check (kind in ('sunday_paper', 'invitation')),
  lang text not null check (lang in ('en', 'ar')),
  stage text not null default 'new'
    check (stage in ('new', 'segment', 'imported', 'sent', 'done', 'empty')),
  segment_id text,
  import_id text,
  broadcast_id text,
  recipients integer not null default 0 check (recipients >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table core.broadcasts enable row level security;

create policy "No third-party apps" on core.broadcasts
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

revoke all on core.broadcasts from anon, authenticated;
grant all on core.broadcasts to service_role;

comment on table core.broadcasts is
  'One row per Resend Broadcast (the Sunday Paper by month and language, the invitation): its segment, contact import and Broadcast ids, and how far it has got. Written only by the API routes.';

-- 2. Who the Sunday Paper goes to: members who take optional email, then
-- the public list less the members on it. Read with the secret key.
create function private.sunday_paper_recipients()
returns table (email text, lang text, user_id uuid, subscriber_id uuid, token text)
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email), case when pr.locale = 'ar' then 'ar' else 'en' end,
    pr.id, null::uuid, null::text
  from core.profiles pr
  join auth.users u on u.id = pr.id
  where pr.notify_email and membership.is_member(pr.id) and u.email is not null
  union all
  select s.email, case when s.lang = 'ar' then 'ar' else 'en' end,
    null::uuid, s.id, s.unsubscribe_token
  from content.newsletter_subscribers s
  where s.status = 'subscribed'
    and not exists (
      select 1 from auth.users u
      join core.profiles pr on pr.id = u.id
      where lower(u.email) = lower(s.email)
        and pr.notify_email and membership.is_member(pr.id)
    );
$$;

revoke all on function private.sunday_paper_recipients() from public, anon, authenticated;
grant execute on function private.sunday_paper_recipients() to service_role;

create function core.sunday_paper_recipients()
returns table (email text, lang text, user_id uuid, subscriber_id uuid, token text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.sunday_paper_recipients() $$;

revoke all on function core.sunday_paper_recipients() from public, anon, authenticated;
grant execute on function core.sunday_paper_recipients() to service_role;

-- 3. Unsubscribes made through Resend come back here: a member stops
-- optional email (as the paper's own stop link does), a subscriber leaves
-- the public list, an invited address leaves the invitation list.
create function private.apply_broadcast_unsubscribes(emails text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  m integer;
begin
  update core.profiles pr set notify_email = false
  from auth.users u
  where u.id = pr.id and lower(u.email) = any (emails) and pr.notify_email;
  get diagnostics m = row_count;
  n := n + m;
  update content.newsletter_subscribers s set status = 'unsubscribed'
  where s.email = any (emails) and s.status <> 'unsubscribed';
  get diagnostics m = row_count;
  n := n + m;
  delete from membership.invitations i where i.email = any (emails);
  get diagnostics m = row_count;
  return n + m;
end;
$$;

revoke all on function private.apply_broadcast_unsubscribes(text[]) from public, anon, authenticated;
grant execute on function private.apply_broadcast_unsubscribes(text[]) to service_role;

create function core.apply_broadcast_unsubscribes(emails text[])
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.apply_broadcast_unsubscribes(emails) $$;

revoke all on function core.apply_broadcast_unsubscribes(text[]) from public, anon, authenticated;
grant execute on function core.apply_broadcast_unsubscribes(text[]) to service_role;

-- 4. The Sunday Paper queues one job, not one email per person. The issue
-- is recorded with the count it goes to.
create or replace function private.queue_sunday_paper(
  on_day date default (now() at time zone 'Asia/Baghdad')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - interval '1 month';
  issue_month text := to_char(on_day, 'YYYY-MM');
  n integer;
begin
  -- The first Sunday of the month only (the job runs every Sunday), and
  -- once a month.
  if extract(isodow from on_day) <> 7 or extract(day from on_day) > 7 then
    return 0;
  end if;
  if exists (select 1 from content.sunday_paper_issues i where i.month = issue_month) then
    return 0;
  end if;
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

  select count(*)::integer into n from private.sunday_paper_recipients();
  if n = 0 then
    return 0;
  end if;
  perform private.enqueue('sunday_paper.broadcast',
    jsonb_build_object('month', issue_month, 'since', since));
  insert into content.sunday_paper_issues (month, sent_on, recipients)
  values (issue_month, on_day, n);
  return n;
end;
$$;

revoke all on function private.queue_sunday_paper(date) from public, anon, authenticated;

-- 5. The invitation: the President's go queues one job; every address not
-- yet sent and with no account is marked sent.
create or replace function private.send_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not (access.has_permission('roles.assign') and access.has_permission('governance.manage')) then
    raise exception 'The President sends the invitations' using errcode = '42501';
  end if;
  update membership.invitations i set sent_at = now()
  where i.sent_at is null
    and not exists (select 1 from auth.users u where lower(u.email) = i.email);
  get diagnostics n = row_count;
  if n > 0 then
    perform private.enqueue('membership.invitations', jsonb_build_object('sent_at', now()));
  end if;
  return n;
end;
$$;

revoke all on function private.send_invitations() from public, anon;
grant execute on function private.send_invitations() to authenticated;

-- 6. The spring 2026 import (decisions §1 and §2): the Tour's pages and the
-- invitation list, uploaded once from the Diwan by whoever runs the Tour,
-- never kept in a migration (personal data lives only on the site). Run
-- again, it updates what it imported. A page whose writer already has an
-- account is attached to it at once; the rest wait for their writers.
create function private.import_tour(pages jsonb, invitations jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p jsonb;
  i jsonb;
  page_count integer := 0;
  invite_count integer := 0;
  attached integer;
begin
  if not private.runs_the_tour() then
    raise exception 'Whoever runs the Tour imports its pages' using errcode = '42501';
  end if;

  for p in select * from jsonb_array_elements(coalesce(pages, '[]'::jsonb)) loop
    insert into programmes.six_words (
      user_id, text, language, tour, page_ref, station, typed_on, writer_name,
      email, editor_status, editor_tier, publishable, visibility, recorded_by
    )
    values (
      null,
      btrim(p ->> 'text'),
      case when p ->> 'language' in ('en', 'ar') then p ->> 'language' else 'other' end,
      nullif(btrim(p ->> 'tour'), ''),
      btrim(p ->> 'page_ref'),
      nullif(btrim(p ->> 'station'), ''),
      nullif(btrim(p ->> 'date'), ''),
      nullif(btrim(p ->> 'writer_name'), ''),
      nullif(lower(btrim(p ->> 'email')), ''),
      nullif(btrim(p ->> 'status'), ''),
      nullif(btrim(p ->> 'tier'), ''),
      coalesce(p ->> 'status', '') <> 'Not for publication',
      'private',
      (select auth.uid())
    )
    on conflict (page_ref) do update set
      text = excluded.text,
      language = excluded.language,
      tour = excluded.tour,
      station = excluded.station,
      typed_on = excluded.typed_on,
      writer_name = excluded.writer_name,
      email = excluded.email,
      editor_status = excluded.editor_status,
      editor_tier = excluded.editor_tier,
      publishable = excluded.publishable;
    page_count := page_count + 1;
  end loop;

  for i in select * from jsonb_array_elements(coalesce(invitations, '[]'::jsonb)) loop
    insert into membership.invitations (email, first_name, kind, station, words, quote_words, pages, source)
    values (
      lower(btrim(i ->> 'email')),
      nullif(btrim(i ->> 'first_name'), ''),
      case when i ->> 'kind' = 'plain' then 'plain' else 'tour' end,
      nullif(btrim(i ->> 'station'), ''),
      nullif(btrim(i ->> 'their_words'), ''),
      lower(coalesce(i ->> 'quote_words', '')) in ('yes', 'true'),
      greatest(1, least(4, coalesce((i ->> 'pages')::integer, 1))),
      'tour_2026'
    )
    on conflict (email) do update set
      first_name = excluded.first_name,
      kind = excluded.kind,
      station = excluded.station,
      words = excluded.words,
      quote_words = excluded.quote_words,
      pages = excluded.pages
    where membership.invitations.sent_at is null;
    invite_count := invite_count + 1;
  end loop;

  -- Writers who already have an account get their pages now.
  update programmes.six_words w set user_id = u.id, claimed_at = now()
  from auth.users u
  where w.user_id is null and w.email is not null and lower(u.email) = w.email;
  get diagnostics attached = row_count;

  return jsonb_build_object('pages', page_count, 'invitations', invite_count, 'attached', attached);
end;
$$;

revoke all on function private.import_tour(jsonb, jsonb) from public, anon;
grant execute on function private.import_tour(jsonb, jsonb) to authenticated;

create function programmes.import_tour(pages jsonb, invitations jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.import_tour(pages, invitations) $$;

revoke all on function programmes.import_tour(jsonb, jsonb) from public, anon;
grant execute on function programmes.import_tour(jsonb, jsonb) to authenticated;

-- 7. What the Diwan shows before the President sends: how many are waiting.
create function private.invitations_waiting()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_permission('members.manage') or private.runs_the_tour() then
    jsonb_build_object(
      'waiting', (select count(*) from membership.invitations i
        where i.sent_at is null
          and not exists (select 1 from auth.users u where lower(u.email) = i.email)),
      'sent', (select count(*) from membership.invitations i where i.sent_at is not null),
      'joined', (select count(*) from membership.invitations i where i.joined_at is not null),
      'pages', (select count(*) from programmes.six_words w where w.tour is not null),
      'unclaimed', (select count(*) from programmes.six_words w where w.tour is not null and w.user_id is null)
    )
  end
$$;

revoke all on function private.invitations_waiting() from public, anon;
grant execute on function private.invitations_waiting() to authenticated;

create function membership.invitations_waiting()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.invitations_waiting() $$;

revoke all on function membership.invitations_waiting() from public, anon;
grant execute on function membership.invitations_waiting() to authenticated;
