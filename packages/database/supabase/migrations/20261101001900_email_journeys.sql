-- Every email the platform sends, audited (owner, Nov 4, 2026): what was
-- missing is added, what was noise is merged, and every promise an email
-- makes is kept. Each journey below queues its notice in core.outbox; the
-- API routes write and send it (apps/web/lib/api/outbox.ts).
--
--  1. An event that is canceled, or moves (its day, time or place), tells
--     everyone booked, waiting or asking to be reminded. Edits made close
--     together go out as one notice, ten minutes after the last.
--  2. Partner applications: the applicant hears it arrived and how it was
--     decided; Partnerships and the President hear a new one is waiting.
--  3. Elections: the notice to every member, voting open and the results
--     to everyone on the register; a nominee hears the committee's answer.
--  4. A certificate tells its holder once it is signed and issued.
--  5. A concern, a motion or a pitch tells its sender when it is taken up
--     (acknowledged) and when it is closed.
--  6. A removal request tells its requester when it is done (the receipt
--     promised it), in the language they asked in.
--  7. Hiring and places: a member hears when Membership sets a time to
--     talk, makes an offer or chooses someone else (onboarding is the
--     role's own email); a place
--     given (an Apprenticeship, First Ink, a volunteer place) says so; an
--     audition time confirms, and the Company's answer follows.
--  8. A new role says what it opens and, for a sensitive one, to set up
--     two-step sign-in first.
--  9. A member's first pledge (the end of the welcome) sends a welcome.
-- 10. Shifts tomorrow get a reminder, like booked events (optional email).
-- 11. The Qirtas Awards: shortlisted and winning authors hear on the day.
-- 12. Merged: Membership gets one digest a day of replies on Get involved,
--     in place of an email per reply.
-- 13. Capped: an unsigned agreement is reminded weekly for four weeks, not
--     for ever.

-- ── 1. Events canceled or moved ─────────────────────────────────────────────
create function private.after_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  change text;
begin
  if old.status <> 'published' or greatest(old.starts_at, new.starts_at) < now() then
    return new;
  end if;
  if new.status = 'cancelled' then
    change := 'cancelled';
  elsif new.status = 'published' and (
      new.starts_at is distinct from old.starts_at
      or new.venue_en is distinct from old.venue_en
      or new.venue_ar is distinct from old.venue_ar) then
    change := 'moved';
  else
    return new;
  end if;
  for r in
    select x.user_id from events.rsvps x where x.event_id = new.id and x.status = 'confirmed'
    union
    select w.user_id from events.waitlist w where w.event_id = new.id and w.status = 'waiting'
    union
    select m.user_id from events.reminders m where m.event_id = new.id
  loop
    -- One notice per person while one is waiting: later edits ride it, and
    -- it reads the event as it is when it goes, ten minutes on.
    if not exists (
      select 1 from core.outbox o
      where o.kind = 'events.changed' and o.processed_at is null
        and o.payload ->> 'event_id' = new.id::text
        and o.payload ->> 'user_id' = r.user_id::text
    ) then
      perform private.enqueue('events.changed',
        jsonb_build_object('event_id', new.id, 'user_id', r.user_id, 'change', change,
          'send_after', to_char((now() + interval '10 minutes') at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.after_event_change() from public, anon, authenticated;

create trigger after_event_change after update of status, starts_at, venue_en, venue_ar
  on events.events
  for each row execute function private.after_event_change();

-- ── 2. Partner applications ────────────────────────────────────────────────
create function private.after_partner_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.applied_by is not null then
    perform private.enqueue('partners.application_received',
      jsonb_build_object('agreement_id', new.id, 'user_id', new.applied_by));
  end if;
  return new;
end;
$$;
revoke all on function private.after_partner_application() from public, anon, authenticated;

create trigger after_partner_application after insert on governance.partner_agreements
  for each row execute function private.after_partner_application();

create function private.after_partner_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant uuid;
begin
  if old.status = 'prospect' and new.status in ('active', 'ended') then
    select a.applied_by into applicant
    from governance.partner_agreements a
    where a.partner_id = new.id and a.applied_by is not null
    order by a.created_at desc
    limit 1;
    if applicant is not null then
      perform private.enqueue('partners.application_decided',
        jsonb_build_object('partner_id', new.id, 'user_id', applicant,
          'approved', new.status = 'active'));
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.after_partner_decided() from public, anon, authenticated;

create trigger after_partner_decided after update of status on governance.partners
  for each row execute function private.after_partner_decided();

-- ── 3. Elections ────────────────────────────────────────────────────────────
-- The notice goes to every member; voting and the results to everyone on
-- the election's register (made on the notice day).
create function private.after_election_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if new.status is not distinct from old.status
    or new.status not in ('notice', 'voting', 'published') then
    return new;
  end if;
  for r in
    select m.user_id from membership.memberships m where new.status = 'notice'
    union
    select v.user_id from governance.voters v
    where new.status in ('voting', 'published') and v.election_id = new.id
  loop
    perform private.enqueue_once('governance.election',
      jsonb_build_object('election_id', new.id, 'user_id', r.user_id, 'stage', new.status),
      interval '30 days');
  end loop;
  return new;
end;
$$;
revoke all on function private.after_election_stage() from public, anon, authenticated;

create trigger after_election_stage after update of status on governance.elections
  for each row execute function private.after_election_stage();

create function private.after_candidacy_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform private.enqueue('governance.candidacy_decided',
      jsonb_build_object('candidate_id', new.id, 'user_id', new.user_id,
        'approved', new.status = 'approved'));
  end if;
  return new;
end;
$$;
revoke all on function private.after_candidacy_decided() from public, anon, authenticated;

create trigger after_candidacy_decided after update of status on governance.candidates
  for each row execute function private.after_candidacy_decided();

-- ── 4. Certificates issued ─────────────────────────────────────────────────
create function private.after_certificate_issued()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'issued' and old.status is distinct from 'issued' then
    perform private.enqueue('membership.certificate_issued',
      jsonb_build_object('certificate_id', new.id, 'user_id', new.user_id));
  end if;
  return new;
end;
$$;
revoke all on function private.after_certificate_issued() from public, anon, authenticated;

create trigger after_certificate_issued after update of status on membership.certificates
  for each row execute function private.after_certificate_issued();

-- ── 5. Requests taken up and closed ────────────────────────────────────────
create function private.after_request_handled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.submitted_by is not null
    and new.status is distinct from old.status
    -- Taken up, then closed: "in progress" is the officer's own step.
    and new.status in ('acknowledged', 'closed') then
    perform private.enqueue('forms.updated',
      jsonb_build_object('submission_id', new.id, 'user_id', new.submitted_by,
        'status', new.status));
  end if;
  return new;
end;
$$;
revoke all on function private.after_request_handled() from public, anon, authenticated;

create trigger after_request_handled after update of status on governance.form_submissions
  for each row execute function private.after_request_handled();

-- ── 6. Removal requests: the requester's language, and the done notice ─────
alter table programmes.removal_requests
  add column requester_lang text not null default 'en'
    check (requester_lang in ('en', 'ar'));

comment on column programmes.removal_requests.requester_lang is
  'The language the request was made in; the receipt and the done notice use it.';

create function private.after_removal_done()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and new.status in ('removed', 'declined', 'closed')
    and old.status in ('open', 'in_progress') then
    perform private.enqueue('programmes.removal_done',
      jsonb_build_object('request_id', new.id));
  end if;
  return new;
end;
$$;
revoke all on function private.after_removal_done() from public, anon, authenticated;

create trigger after_removal_done after update of status on programmes.removal_requests
  for each row execute function private.after_removal_done();

-- ── 7. Hiring, places and auditions ────────────────────────────────────────
create function private.after_reply_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status
        -- Onboarding is told by the role's own email (access.role_assigned).
        and new.status in ('talking', 'offered', 'not_picked'))
     or (new.status = 'talking' and new.talk_at is not null
        and new.talk_at is distinct from old.talk_at) then
    perform private.enqueue('programmes.reply_update',
      jsonb_build_object('opening_id', new.opening_id, 'user_id', new.user_id,
        'status', new.status));
  end if;
  return new;
end;
$$;
revoke all on function private.after_reply_update() from public, anon, authenticated;

create trigger after_reply_update after update of status, talk_at on programmes.opening_replies
  for each row execute function private.after_reply_update();

-- Replies reach Membership as one digest a day (daily_notices), not one
-- email each.
drop trigger after_opening_reply on programmes.opening_replies;
drop function private.after_opening_reply();

create function private.after_placement_given()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue('programmes.placement_given',
    jsonb_build_object('placement_id', new.id, 'user_id', new.user_id));
  return new;
end;
$$;
revoke all on function private.after_placement_given() from public, anon, authenticated;

create trigger after_placement_given after insert on programmes.placements
  for each row execute function private.after_placement_given();

create function private.after_audition_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('signed_up', 'called_back', 'cast', 'not_cast')
    and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    perform private.enqueue('programmes.audition_update',
      jsonb_build_object('audition_id', new.audition_id, 'user_id', new.user_id,
        'status', new.status));
  end if;
  return new;
end;
$$;
revoke all on function private.after_audition_update() from public, anon, authenticated;

create trigger after_audition_update after insert or update of status
  on programmes.audition_signups
  for each row execute function private.after_audition_update();

-- ── 8. A new role ───────────────────────────────────────────────────────────
-- A partner's Lead or Team hear through the application or the invitation.
create function private.after_role_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scope_type <> 'partner' then
    perform private.enqueue('access.role_assigned',
      jsonb_build_object('assignment_id', new.id, 'user_id', new.user_id));
  end if;
  return new;
end;
$$;
revoke all on function private.after_role_assigned() from public, anon, authenticated;

create trigger after_role_assigned after insert on access.role_assignments
  for each row execute function private.after_role_assigned();

-- ── 9. Welcome ──────────────────────────────────────────────────────────────
create function private.after_first_pledge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pledge_type = 'member' and not exists (
    select 1 from membership.pledges p
    where p.user_id = new.user_id and p.pledge_type = 'member' and p.id <> new.id
  ) then
    perform private.enqueue_once('membership.welcome',
      jsonb_build_object('user_id', new.user_id), interval '3650 days');
  end if;
  return new;
end;
$$;
revoke all on function private.after_first_pledge() from public, anon, authenticated;

create trigger after_first_pledge after insert on membership.pledges
  for each row execute function private.after_first_pledge();

-- ── 10–13. The daily notices ────────────────────────────────────────────────
create or replace function private.daily_notices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
    if private.enqueue_once('programmes.shift_reminder',
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
    if private.enqueue_once('journal.agreement_reminder',
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
    if private.enqueue_once('programmes.removal_overdue',
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
    if private.enqueue_once('journal.call_opened',
         jsonb_build_object('call_id', r.call_id, 'user_id', r.user_id), interval '60 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Replies on Get involved since yesterday: one digest for Membership.
  if exists (
    select 1 from programmes.opening_replies x
    where x.created_at > now() - interval '1 day'
  ) then
    if private.enqueue_once('programmes.replies_digest',
         jsonb_build_object('day', today), interval '2 days') then
      queued := queued + 1;
    end if;
  end if;

  -- The Qirtas Awards: shortlisted authors on the shortlist day, winners
  -- on the award day (what the public reads from the same day).
  for r in
    select e.id as entry_id, c.user_id,
      case when w.awarded_on = today and e.won then 'won' else 'shortlisted' end as stage
    from journal.prize_rounds w
    join journal.prize_entries e on e.round_id = w.id
    join journal.pieces p on p.id = e.piece_id
    join journal.contributors c on c.id = p.contributor_id
    where w.is_published
      and c.user_id is not null
      and (w.shortlist_on = today or (w.awarded_on = today and e.won))
  loop
    if private.enqueue_once('journal.award',
         jsonb_build_object('entry_id', r.entry_id, 'user_id', r.user_id, 'stage', r.stage),
         interval '400 days') then
      queued := queued + 1;
    end if;
  end loop;

  return queued;
end;
$$;
