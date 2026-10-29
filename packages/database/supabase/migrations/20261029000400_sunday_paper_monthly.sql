-- The Sunday Paper is monthly, on the first Sunday (owner, Oct 29, 2026).
-- The Month in Qirtas merges into it and its name is retired (the code
-- keeps content.newsletter_subscribers and the 'newsletter.monthly' outbox
-- kind for the public list). One paper for members who receive email and
-- for the public list: the month's pieces, What's on, and the Callboard's
-- open places (the outbox builds it). Nothing goes out in a month with no
-- pieces and nothing on.

select cron.unschedule('sal-newsletter');
drop function private.queue_newsletter();
drop function private.queue_sunday_paper();

create function private.queue_sunday_paper(
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
  -- The first Sunday of the month only (the job runs every Sunday).
  if extract(isodow from on_day) <> 7 or extract(day from on_day) > 7 then
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
  return n;
end;
$$;

revoke all on function private.queue_sunday_paper(date) from public, anon, authenticated;

-- The job keeps its name and its hour (06:00 UTC is 9:00 AM in Baghdad);
-- the function sends only on the first Sunday.
select cron.unschedule('sal-sunday-paper');
select cron.schedule('sal-sunday-paper', '0 6 * * 0', $$ select private.queue_sunday_paper() $$);
