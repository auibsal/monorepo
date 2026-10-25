-- Qirtas, two doors (owner, 2026-10-25: "go for everything").
--
-- * The newsroom is always open; the Edition takes work only while a call
--   is open. Members who want to know when the next call opens ask once
--   (journal.call_alerts) and are emailed when it opens.
-- * Fewer types. Letters: poetry, prose, drama, translation. Gallery: art
--   and photography, comics and photo essays. Prose replaces fiction and
--   creative nonfiction; comics take photo essays. The old types stay for
--   the work already sent, and take no new submissions.
-- * Six Words come only from the Typewriter Tour. Members no longer write
--   them on the site: officers transcribe the cards
--   (programmes.record_six_words), and a volunteer attaches a card to its
--   writer by scanning the writer's membership card
--   (programmes.attach_six_words). Entries without a writer show unsigned.

alter type journal.category add value if not exists 'prose' after 'poetry';


-- ── Tell me when a call opens ───────────────────────────────────────────────

create table journal.call_alerts (
  user_id uuid primary key references core.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table journal.call_alerts is
  'Members who asked to be emailed when the next Qirtas call opens. Each reads and writes their own.';

alter table journal.call_alerts enable row level security;

create policy "Members read their call alert" on journal.call_alerts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members ask to hear about calls" on journal.call_alerts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members drop their call alert" on journal.call_alerts
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "Third-party apps reach only their areas" on journal.call_alerts
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

grant select, insert, delete on journal.call_alerts to authenticated;
grant all on journal.call_alerts to service_role;

-- ── Six Words from the Typewriter Tour ──────────────────────────────────────

drop policy "Members write their own six words" on programmes.six_words;
drop policy "Members edit their own six words" on programmes.six_words;
revoke insert, update on programmes.six_words from authenticated;
drop trigger before_six_words_update on programmes.six_words;
drop function private.before_six_words_update();

alter table programmes.six_words
  alter column user_id drop not null,
  alter column user_id drop default,
  add column recorded_by uuid references auth.users (id) on delete set null;

create index six_words_recorded_by_idx on programmes.six_words (recorded_by);

comment on column programmes.six_words.user_id is
  'The writer, once their membership card is scanned at the Tour; null for an unsigned card.';

create trigger revalidate_insert after insert or delete on programmes.six_words
  for each statement execute function private.queue_revalidation('programmes');

-- Who may transcribe and attach cards: those who run the Typewriter Tour.
create function private.runs_the_tour()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('programmes.manage', 'programme',
    (select p.id from core.programmes p where p.slug = 'typewriter-tour'));
$$;

-- The member a scanned card names, if its code is live.
create function private.live_card_holder(card_code text, digits text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  holder membership.cards;
begin
  select * into holder from membership.cards c
  where c.code = lower(trim(live_card_holder.card_code));
  if not found then
    raise exception 'Card not found' using errcode = 'P0002';
  end if;
  if not coalesce(private.totp_live(holder.secret, live_card_holder.digits), false) then
    raise exception 'card_not_live' using errcode = '22023';
  end if;
  return holder.user_id;
end;
$$;

-- A card from the Tour, as written. With a scanned card, it is the
-- member's six words (replacing any earlier ones); without, it is unsigned.
create function private.record_six_words(
  words text, language text, card_code text default null, digits text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer uuid;
  entry uuid;
begin
  if not private.runs_the_tour() then
    raise exception 'programmes.manage for the Typewriter Tour is required' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(card_code, '')), '') is not null then
    writer := private.live_card_holder(card_code, digits);
    delete from programmes.six_words w where w.user_id = writer;
  end if;
  insert into programmes.six_words (user_id, text, language, status, moderated_by, moderated_at, recorded_by)
  values (writer, regexp_replace(trim(words), '\s+', ' ', 'g'), record_six_words.language,
    'approved', (select auth.uid()), now(), (select auth.uid()))
  returning id into entry;
  return entry;
end;
$$;

-- Attach an unsigned card to its writer by scanning their membership card.
create function private.attach_six_words(entry_id uuid, card_code text, digits text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer uuid;
begin
  if not private.runs_the_tour() then
    raise exception 'programmes.manage for the Typewriter Tour is required' using errcode = '42501';
  end if;
  writer := private.live_card_holder(card_code, digits);
  delete from programmes.six_words w where w.user_id = writer and w.id <> attach_six_words.entry_id;
  update programmes.six_words w set user_id = writer
  where w.id = attach_six_words.entry_id and w.user_id is null;
  if not found then
    raise exception 'No unsigned card with this id' using errcode = 'P0002';
  end if;
end;
$$;

create function programmes.record_six_words(
  words text, language text, card_code text default null, digits text default null
)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.record_six_words($1, $2, $3, $4) $$;

create function programmes.attach_six_words(entry_id uuid, card_code text, digits text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.attach_six_words($1, $2, $3) $$;

revoke all on function private.runs_the_tour(), private.live_card_holder(text, text),
  private.record_six_words(text, text, text, text), private.attach_six_words(uuid, text, text)
  from public, anon;
grant execute on function private.runs_the_tour(), private.live_card_holder(text, text),
  private.record_six_words(text, text, text, text), private.attach_six_words(uuid, text, text)
  to authenticated, service_role;
revoke all on function programmes.record_six_words(text, text, text, text),
  programmes.attach_six_words(uuid, text, text) from public, anon;
grant execute on function programmes.record_six_words(text, text, text, text),
  programmes.attach_six_words(uuid, text, text) to authenticated, service_role;

-- Unsigned cards show without a name.
create or replace function private.six_words_wall(max_results integer default 200)
returns table (id uuid, text text, language text, author_en text, author_ar text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.text, w.language,
    case when w.show_name then p.full_name_en end,
    case when w.show_name then p.full_name_ar end,
    w.created_at
  from programmes.six_words w
  left join core.profiles p on p.id = w.user_id
  where w.status = 'approved'
  order by w.created_at desc
  limit least(greatest(max_results, 1), 500);
$$;

-- ── Submissions: no Six Words, no retired types ─────────────────────────────

create or replace function private.before_submission_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c journal.calls;
  existing integer;
  recent integer;
  desk journal.desk := journal.desk_of(new.category);
begin
  -- Serialise submissions per author so the counts below can't race.
  perform pg_advisory_xact_lock(hashtext('journal.submissions:' || new.author_id::text));

  -- The types members send (owner, 2026-10-25): fewer, plainer choices.
  -- Six Words come only from the Typewriter Tour, transcribed by officers.
  if new.category = 'six_words' then
    raise exception 'six_words_on_tour' using errcode = '22023';
  end if;
  if new.category in ('fiction', 'creative_nonfiction', 'photo_essay') then
    raise exception 'category_retired' using errcode = '22023';
  end if;

  if journal.is_edition_desk(desk) then
    select * into c from journal.calls where id = new.call_id;
    if not found or not c.is_published then
      raise exception 'Call not found' using errcode = 'P0002';
    end if;
    if now() < c.opens_at or now() > c.closes_at then
      raise exception 'This call is not open' using errcode = '22023';
    end if;
    if not (desk = any (c.desks)) then
      raise exception 'This call is not for % work', desk using errcode = '22023';
    end if;

    -- Conflicts and staff work: the Editor-in-Chief, Managing Editor and
    -- Submissions Manager do not submit while in office, and no one submits
    -- to a desk they edit.
    if access.has_permission('journal.approve', 'issue', c.issue_id)
       or access.has_permission('journal.identity.view', 'issue', c.issue_id) then
      raise exception 'staff_cannot_submit' using errcode = '42501';
    end if;
    if access.has_permission('journal.edit.' || desk::text, 'issue', c.issue_id) then
      raise exception 'desk_editor_cannot_submit' using errcode = '42501';
    end if;

    select count(*) into existing from journal.submissions s
    where s.call_id = new.call_id and s.author_id = new.author_id and s.status <> 'withdrawn';
    if existing >= c.max_per_person then
      raise exception 'You can send at most % submissions to this call', c.max_per_person
        using errcode = '23514';
    end if;
  elsif new.call_id is not null then
    raise exception '% work is not sent to a call', desk using errcode = '22023';
  end if;

  select count(*) into recent from journal.submissions s
  where s.author_id = new.author_id and s.created_at > now() - interval '1 hour';
  if recent >= 3 then
    raise exception 'Too many submissions in the last hour; try again later'
      using errcode = '54000';
  end if;

  new.status := 'received';
  return new;
end;
$function$;

-- ── The call alert in the daily notices ────────────────────────────────────

create or replace function private.daily_notices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  queued integer := 0;
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
      and (e.starts_at at time zone 'Asia/Baghdad')::date
        = (now() at time zone 'Asia/Baghdad')::date + 1
  loop
    if private.enqueue_once('events.reminder',
         jsonb_build_object('event_id', r.event_id, 'user_id', r.user_id), interval '2 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Accepted work with no signed agreement after three days: weekly reminder.
  for r in
    select s.id as submission_id, s.author_id as user_id
    from journal.submissions s
    join journal.blind_keys k on k.submission_id = s.id
    join journal.decisions d on d.blind_entry_id = k.blind_entry_id
    where s.status = 'accepted'
      and d.decided_at < now() - interval '3 days'
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

  return queued;
end;
$function$;
