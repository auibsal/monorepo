-- The Sunday Paper's issues, as sent (owner, Nov 7, 2026). The archive
-- rebuilt an issue for every month since the oldest published piece, so
-- months that were never sent showed as past issues (the Waraq news archive
-- carries older dates). Now the job that queues an issue records it, and the
-- archive lists only what was sent: nothing until the first issue, Sunday,
-- December 6, 2026.

create table content.sunday_paper_issues (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  sent_on date not null,
  recipients integer not null check (recipients > 0),
  created_at timestamptz not null default now()
);

alter table content.sunday_paper_issues enable row level security;

create policy "No third-party apps" on content.sunday_paper_issues
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('content')))
  with check ((select private.client_allows('content')));

create policy "Anyone reads the issues sent" on content.sunday_paper_issues
  for select to anon, authenticated
  using (true);

revoke all on content.sunday_paper_issues from anon, authenticated;
grant select (month, sent_on) on content.sunday_paper_issues to anon, authenticated;
grant all on content.sunday_paper_issues to service_role;

-- A new issue refreshes the archive (/sunday-paper).
create trigger revalidate
  after insert on content.sunday_paper_issues
  for each statement execute function private.queue_revalidation('news');

comment on table content.sunday_paper_issues is
  'The Sunday Paper''s issues, one row per month sent, written by private.queue_sunday_paper(). The archive (/sunday-paper) lists these only.';

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
  n integer := 0;
  member uuid;
  subscriber uuid;
begin
  -- The first Sunday of the month only (the job runs every Sunday), and
  -- once a month.
  if extract(isodow from on_day) <> 7 or extract(day from on_day) > 7 then
    return 0;
  end if;
  if exists (
    select 1 from content.sunday_paper_issues i
    where i.month = to_char(on_day, 'YYYY-MM')
  ) then
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

  for member in
    select pr.id from core.profiles pr
    where pr.notify_email and membership.is_member(pr.id)
  loop
    perform private.enqueue('journal.sunday_paper',
      jsonb_build_object('user_id', member, 'since', since));
    n := n + 1;
  end loop;

  -- The public list, less the members who already get it.
  for subscriber in
    select s.id from content.newsletter_subscribers s
    where s.status = 'subscribed'
      and not exists (
        select 1 from auth.users u
        join core.profiles pr on pr.id = u.id
        where lower(u.email) = lower(s.email)
          and pr.notify_email and membership.is_member(pr.id)
      )
  loop
    perform private.enqueue('newsletter.monthly',
      jsonb_build_object('subscriber_id', subscriber, 'since', since));
    n := n + 1;
  end loop;

  if n > 0 then
    insert into content.sunday_paper_issues (month, sent_on, recipients)
    values (to_char(on_day, 'YYYY-MM'), on_day, n);
  end if;
  return n;
end;
$$;

revoke all on function private.queue_sunday_paper(date) from public, anon, authenticated;
