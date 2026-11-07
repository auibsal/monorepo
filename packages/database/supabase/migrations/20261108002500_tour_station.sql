-- The Tour's station (decisions §12, Nov 7, night). A trained volunteer on
-- a station shift may do one thing while the shift runs: scan a live card
-- (a Member's or a Guest's), photograph the typed page and attach it to
-- that account, private by default. Faculty, staff and alumni send
-- "Request Associate membership" on /join at the station; their page is
-- photographed against the request, kept private, attached when the
-- Director of Membership approves and deleted if the request is declined.
-- Every page the station takes is logged. Tested at the Dec 1 event.

-- ── Station shifts ──────────────────────────────────────────────────────────

alter table programmes.shifts
  add column station boolean not null default false;
comment on column programmes.shifts.station is
  'A Tour station shift (decisions §12): its confirmed volunteers (confirmed by the event lead once trained) may attach typed pages to live cards while the shift runs, and only then.';

-- The station shift the signed-in volunteer is on right now, if any: a
-- confirmed place on a station shift whose window holds now.
create function private.my_station_shift()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select sh.id
  from programmes.shifts sh
  join programmes.shift_signups su on su.shift_id = sh.id
  where sh.station
    and su.user_id = (select auth.uid())
    and su.status = 'confirmed'
    and now() >= sh.starts_at and now() < sh.ends_at
  order by sh.ends_at
  limit 1
$$;

revoke all on function private.my_station_shift() from public, anon;
grant execute on function private.my_station_shift() to authenticated;

create function programmes.my_station_shift()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select private.my_station_shift() $$;

revoke all on function programmes.my_station_shift() from public, anon;
grant execute on function programmes.my_station_shift() to authenticated;

-- ── Requests for Associate membership ───────────────────────────────────────

create table membership.associate_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  relation text not null check (relation in ('faculty', 'staff', 'alumni')),
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  reason text check (char_length(reason) <= 1000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  invitation_id uuid references governance.partner_invitations (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index associate_requests_one_pending_idx
  on membership.associate_requests (email) where status = 'pending';
create index associate_requests_status_idx on membership.associate_requests (status, created_at);
create index associate_requests_decided_by_idx on membership.associate_requests (decided_by);
create index associate_requests_invitation_idx on membership.associate_requests (invitation_id);

alter table membership.associate_requests enable row level security;

create policy "No third-party apps" on membership.associate_requests
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

create policy "The Director of Membership reads the requests" on membership.associate_requests
  for select to authenticated
  using ((select private.has_permission('members.manage')));

comment on table membership.associate_requests is
  'Request Associate membership (decisions §2, §12): faculty, staff and alumni ask on /join (the API route, rate limited); the Director of Membership approves (a named invitation, the one invitation system) or declines with a reason. Pages taken at the Tour against a pending request wait on it.';

revoke all on membership.associate_requests from anon, authenticated;
grant select on membership.associate_requests to authenticated;
grant all on membership.associate_requests to service_role;

-- ── Pages the station takes ─────────────────────────────────────────────────

alter table programmes.six_words
  alter column text drop not null,
  add column photo_path text check (photo_path ~ '^station/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  add column station_shift_id uuid references programmes.shifts (id) on delete set null,
  add column associate_request_id uuid references membership.associate_requests (id) on delete cascade,
  add constraint six_words_text_or_photo check (text is not null or photo_path is not null);

create index six_words_station_shift_idx on programmes.six_words (station_shift_id);
create index six_words_associate_request_idx on programmes.six_words (associate_request_id);

comment on column programmes.six_words.photo_path is
  'The page as the station photographed it, in the private tour-pages bucket (read through /api/tour/photo).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tour-pages', 'tour-pages', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- The page as the station takes it: to a live card's holder, or against a
-- pending Associate request (found by its address, which the volunteer
-- reads from the request the visitor just sent). Returns the page's TOUR
-- code; the photo is already uploaded by the API route, which alone holds
-- the bucket.
create function private.station_attach(
  card_code text,
  digits text,
  request_email text,
  photo text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  shift uuid := private.my_station_shift();
  holder uuid;
  request membership.associate_requests;
  tour_name text;
  ref text;
begin
  if shift is null then
    raise exception 'station_closed' using errcode = '42501',
      hint = 'Only a confirmed volunteer on a station shift, while it runs.';
  end if;
  if photo is null or photo !~ '^station/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'photo_required' using errcode = '22023';
  end if;
  select e.title_en into tour_name
  from programmes.shifts sh join events.events e on e.id = sh.event_id
  where sh.id = shift;

  if nullif(btrim(coalesce(card_code, '')), '') is not null then
    holder := private.live_card_holder(card_code, digits);
    insert into programmes.six_words (
      user_id, text, language, tour, visibility, recorded_by,
      station_shift_id, photo_path, claimed_at
    )
    values (
      holder, null, 'other', tour_name, 'private', (select auth.uid()),
      shift, photo, now()
    )
    returning reference into ref;
  else
    select * into request from membership.associate_requests r
    where r.email = lower(btrim(coalesce(request_email, ''))) and r.status = 'pending';
    if not found then
      raise exception 'no_pending_request' using errcode = 'P0002';
    end if;
    insert into programmes.six_words (
      user_id, text, language, tour, visibility, recorded_by,
      station_shift_id, photo_path, associate_request_id, email
    )
    values (
      null, null, 'other', tour_name, 'private', (select auth.uid()),
      shift, photo, request.id, null
    )
    returning reference into ref;
  end if;
  return ref;
end;
$$;

revoke all on function private.station_attach(text, text, text, text) from public, anon;
grant execute on function private.station_attach(text, text, text, text) to authenticated;

create function programmes.station_attach(
  card_code text,
  digits text,
  request_email text,
  photo text
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.station_attach(card_code, digits, request_email, photo) $$;

revoke all on function programmes.station_attach(text, text, text, text) from public, anon;
grant execute on function programmes.station_attach(text, text, text, text) to authenticated;

-- Every page the station takes is logged (the activity log reads it).
create trigger log_station_page
  after insert on programmes.six_words
  for each row when (new.station_shift_id is not null)
  execute function private.log_activity();

-- ── The Director of Membership decides ──────────────────────────────────────

-- Approving sends the one named invitation (Associate class, fourteen
-- days); the request's pages go to the account that accepts it. Declining
-- carries its reason and deletes the pages taken against the request (and
-- their photos, by the outbox).
create function private.decide_associate_request(request_id uuid, approve boolean, why text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request membership.associate_requests;
  invite uuid;
  photos text[];
begin
  if not private.has_permission('members.manage') then
    raise exception 'The Director of Membership decides' using errcode = '42501';
  end if;
  select * into request from membership.associate_requests
  where id = request_id and status = 'pending'
  for update;
  if not found then
    raise exception 'No pending request %', request_id using errcode = 'P0002';
  end if;
  if not approve and nullif(btrim(coalesce(why, '')), '') is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  if approve then
    insert into governance.partner_invitations (kind, email)
    values ('associate', request.email)
    returning id into invite;
    -- Someone who already has an account under this address gets their
    -- pages now; otherwise the invitation's acceptance brings them.
    update programmes.six_words w set user_id = u.id, claimed_at = now()
    from auth.users u
    where w.associate_request_id = request.id and w.user_id is null
      and lower(u.email) = request.email;
  else
    select coalesce(array_agg(w.photo_path) filter (where w.photo_path is not null), '{}')
    into photos
    from programmes.six_words w
    where w.associate_request_id = request.id and w.user_id is null;
    delete from programmes.six_words w
    where w.associate_request_id = request.id and w.user_id is null;
    if cardinality(photos) > 0 then
      perform private.enqueue('storage.remove',
        jsonb_build_object('bucket', 'tour-pages', 'paths', to_jsonb(photos)));
    end if;
  end if;

  update membership.associate_requests
  set status = case when approve then 'approved' else 'declined' end,
      reason = nullif(btrim(coalesce(why, '')), ''),
      decided_by = (select auth.uid()),
      decided_at = now(),
      invitation_id = invite
  where id = request.id;
end;
$$;

revoke all on function private.decide_associate_request(uuid, boolean, text) from public, anon;
grant execute on function private.decide_associate_request(uuid, boolean, text) to authenticated;

create function membership.decide_associate_request(request_id uuid, approve boolean, why text default null)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.decide_associate_request(request_id, approve, why) $$;

revoke all on function membership.decide_associate_request(uuid, boolean, text) from public, anon;
grant execute on function membership.decide_associate_request(uuid, boolean, text) to authenticated;

-- The invitation accepted: the request's pages go to the new account.
create function private.attach_request_pages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.accepted_by is null or old.accepted_by is not null then
    return new;
  end if;
  update programmes.six_words w set user_id = new.accepted_by, claimed_at = now()
  from membership.associate_requests r
  where r.invitation_id = new.id and w.associate_request_id = r.id and w.user_id is null;
  return new;
end;
$$;

revoke all on function private.attach_request_pages() from public, anon, authenticated;

create trigger attach_request_pages
  after update of accepted_by on governance.partner_invitations
  for each row execute function private.attach_request_pages();

-- Requests decided more than a year ago are not kept (personal data).
create or replace function private.purge_associate_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from membership.associate_requests
  where status <> 'pending' and decided_at < now() - interval '1 year';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.purge_associate_requests() from public, anon, authenticated;

-- The daily list purge (sal-tour-lists) runs it too.
create or replace function private.purge_tour_lists()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  m integer := 0;
  until date := (private.setting('tour.unclaimed_until') #>> '{}')::date;
begin
  -- Every address on a list sent more than thirty days ago, those skipped
  -- because they already had an account among them.
  delete from membership.invitations i
  using membership.invitation_lists l
  where l.source = i.source and l.sent_at is not null and l.sent_at < now() - interval '30 days';
  get diagnostics n = row_count;
  if until is not null and private.today() > until then
    delete from programmes.six_words where user_id is null and tour is not null and associate_request_id is null;
    get diagnostics m = row_count;
  end if;
  return n + m + private.purge_associate_requests();
end;
$$;

revoke all on function private.purge_tour_lists() from public, anon, authenticated;

-- ── Photographed pages are transcribed before they are shown ───────────────

-- A page the station photographed has no text until whoever runs the Tour
-- types it from the photograph (the words are the writer's, typed on the
-- Tour; the site only copies them). Until then it shows nowhere public.
create function private.transcribe_page(page_id uuid, words text, lang text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.runs_the_tour() then
    raise exception 'Whoever runs the Tour transcribes its pages' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(words, '')), '') is null then
    raise exception 'words_required' using errcode = '22023';
  end if;
  update programmes.six_words
  set text = btrim(words),
      language = case when lang in ('en', 'ar') then lang else 'other' end
  where id = page_id and photo_path is not null;
  if not found then
    raise exception 'No photographed page %', page_id using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function private.transcribe_page(uuid, text, text) from public, anon;
grant execute on function private.transcribe_page(uuid, text, text) to authenticated;

create function programmes.transcribe_page(page_id uuid, words text, lang text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.transcribe_page(page_id, words, lang) $$;

revoke all on function programmes.transcribe_page(uuid, text, text) from public, anon;
grant execute on function programmes.transcribe_page(uuid, text, text) to authenticated;

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
  join core.profiles p on p.id = w.user_id
  where w.visibility = 'tour' and w.publishable and w.text is not null
  order by w.created_at desc
  limit least(greatest(max_results, 1), 500);
$$;

create or replace function private.profile_six_words(author_slug text)
returns table (id uuid, text text, language text, tour text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.text, w.language, w.tour, w.created_at
  from programmes.six_words w
  join journal.contributors c
    on c.user_id = w.user_id and not c.is_pen_name and not c.is_anonymous
  where c.slug = profile_six_words.author_slug
    and w.visibility in ('profile', 'tour') and w.publishable and w.text is not null
  order by w.created_at;
$$;
