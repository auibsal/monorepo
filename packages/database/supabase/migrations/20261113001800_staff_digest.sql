-- Staff alerts (decisions.md, Channels and email): urgent at once (a
-- removal request and its deadline, a failed job), the rest in one daily
-- digest per officer: Get involved replies, partner applications, actions
-- waiting for a second officer and problem reports. The daily job queues
-- one staff.digest in place of the replies-only digest.

CREATE OR REPLACE FUNCTION private.daily_notices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  queued integer := 0;
  today date := (now() at time zone 'Asia/Baghdad')::date;
  r record;
begin
  -- Events tomorrow (Baghdad): a reminder to everyone booked, and to
  -- everyone who asked to be reminded ("Remind me").
  for r in
    select e.id as event_id, v.user_id
    from events.events e
    join (
      select x.event_id, x.user_id from events.rsvps x where x.status = 'confirmed'
      union
      select m.event_id, m.user_id from events.reminders m
    ) v on v.event_id = e.id
    where e.status = 'published'
      and (e.starts_at at time zone 'Asia/Baghdad')::date = today + 1
  loop
    if private.enqueue_once('events.reminder',
         jsonb_build_object('event_id', r.event_id, 'user_id', r.user_id), interval '2 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Shifts tomorrow: a reminder to everyone on them.
  for r in
    select s.id as shift_id, g.user_id
    from programmes.shifts s
    join programmes.shift_signups g on g.shift_id = s.id
    where g.status in ('signed_up', 'confirmed')
      and (s.starts_at at time zone 'Asia/Baghdad')::date = today + 1
  loop
    if private.enqueue_once('events.shift_reminder',
         jsonb_build_object('shift_id', r.shift_id, 'user_id', r.user_id), interval '2 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Accepted work with no signed agreement after three days: weekly, for
  -- four weeks (then the editors follow up in person).
  for r in
    select s.id as submission_id, s.author_id as user_id
    from journal.submissions s
    join journal.blind_keys k on k.submission_id = s.id
    join journal.decisions d on d.blind_entry_id = k.blind_entry_id
    where s.status = 'accepted'
      and d.decided_at < now() - interval '3 days'
      and d.decided_at > now() - interval '31 days'
      and not exists (select 1 from journal.agreements a where a.submission_id = s.id)
  loop
    if private.enqueue_once('qirtas.agreement_reminder',
         jsonb_build_object('submission_id', r.submission_id, 'user_id', r.user_id), interval '7 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Roles ending within seven days: one notice.
  for r in
    select a.id as assignment_id, a.user_id
    from access.role_assignments a
    where a.ends_at between now() and now() + interval '7 days'
      and a.scope_type <> 'partner'
  loop
    if private.enqueue_once('access.role_ending',
         jsonb_build_object('assignment_id', r.assignment_id, 'user_id', r.user_id), interval '30 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Removal requests past their 24 hours: tell the managers again, daily.
  for r in
    select q.id as request_id, q.programme_id
    from programmes.removal_requests q
    where q.status in ('open', 'in_progress') and q.due_at < now()
  loop
    if private.enqueue_once('removal.overdue',
         jsonb_build_object('request_id', r.request_id, 'programme_id', r.programme_id), interval '20 hours') then
      queued := queued + 1;
    end if;
  end loop;

  -- A call opened since yesterday: tell everyone who asked ("Tell me when").
  for r in
    select c.id as call_id, a.user_id
    from journal.calls c
    cross join journal.call_alerts a
    where c.is_published
      and c.opens_at between now() - interval '1 day' and now()
      and c.closes_at > now()
  loop
    if private.enqueue_once('qirtas.call_opened',
         jsonb_build_object('call_id', r.call_id, 'user_id', r.user_id), interval '60 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- The staff digest (decisions.md, Channels and email): what waits for
  -- each officer, once a day; urgent alerts still go at once.
  if private.enqueue_once('staff.digest',
       jsonb_build_object('day', today), interval '2 days') then
    queued := queued + 1;
  end if;

  return queued;
end;
$function$;
