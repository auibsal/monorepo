-- Next Stop, activated (decisions.md, What the Society does: Next Stop;
-- Get involved and roles; Brand and design: Video).
--
-- 1. Episodes carry what the page and YouTube need: number, title and
--    description in both languages (title_*, summary_*), one YouTube video
--    per language edition (or one with both caption tracks), the release
--    date, chapters, caption files and a thumbnail.
-- 2. Everyone on camera signs the media release, F-15, on the site: members
--    and guests alike by a single-use link to their address. An episode
--    cannot be published until every release is signed.
-- 3. Credits come from roles scoped to the episode (Next Stop crew), each
--    with its credit, in the American order; guests from the on-camera
--    list; names from the display-name function, never a Society title.
-- 4. The kit's video files live in a private bucket, reached only through
--    the API routes (staff), never in git.

-- ── 1. Episodes ─────────────────────────────────────────────────────────────

alter table programmes.episodes
  add column youtube_id_ar text check (youtube_id_ar ~ '^[A-Za-z0-9_-]{11}$'),
  add column released_on date,
  add column chapters jsonb not null default '[]'::jsonb
    check (jsonb_typeof(chapters) = 'array' and jsonb_array_length(chapters) <= 20),
  add column captions_en_path text check (char_length(captions_en_path) <= 300),
  add column captions_ar_path text check (char_length(captions_ar_path) <= 300),
  add column thumbnail_path text check (char_length(thumbnail_path) <= 300),
  add column duration_seconds integer check (duration_seconds between 1 and 36000);

comment on column programmes.episodes.youtube_id is
  'The English edition on YouTube (or the one video with both caption tracks).';
comment on column programmes.episodes.youtube_id_ar is
  'The Arabic edition, when the episode has one video per language.';
comment on column programmes.episodes.chapters is
  'The parts in order, each {"at": seconds, "title_en", "title_ar"}: the cold open, The ride, The task, The long way home, The exit, the credits.';
comment on column programmes.episodes.captions_en_path is
  'The English caption file (WebVTT) in the media bucket.';

-- WebVTT caption files go in the public media bucket beside the thumbnail.
update storage.buckets
set allowed_mime_types = array(select distinct unnest(allowed_mime_types || array['text/vtt']))
where id = 'media';

-- ── 2. On camera, and the releases ──────────────────────────────────────────

create table programmes.episode_on_camera (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references programmes.episodes (id) on delete cascade,
  -- A member, or a guest named here (guests sign by the link only).
  user_id uuid references auth.users (id) on delete set null,
  guest_name_en text check (char_length(guest_name_en) between 2 and 120),
  guest_name_ar text check (char_length(guest_name_ar) between 2 and 120),
  is_guest boolean not null default false,
  form_link_id uuid references governance.form_links (id) on delete set null,
  release_id uuid references governance.form_submissions (id) on delete set null,
  created_at timestamptz not null default now(),
  check (user_id is not null or guest_name_en is not null)
);

create index episode_on_camera_episode_idx on programmes.episode_on_camera (episode_id);
create index episode_on_camera_user_idx on programmes.episode_on_camera (user_id);
create index episode_on_camera_link_idx on programmes.episode_on_camera (form_link_id);
create index episode_on_camera_release_idx on programmes.episode_on_camera (release_id);

alter table programmes.episode_on_camera enable row level security;

create policy "No third-party apps" on programmes.episode_on_camera
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

create policy "Media keeps who is on camera" on programmes.episode_on_camera
  for all to authenticated
  using ((select private.has_permission('content.manage')))
  with check ((select private.has_permission('content.manage')));

grant select, insert, update (user_id, guest_name_en, guest_name_ar, is_guest), delete
  on programmes.episode_on_camera to authenticated;

comment on table programmes.episode_on_camera is
  'Everyone who appears in an episode, and their signed media release (F-15). Media only; never public.';

create trigger log_activity after insert or update or delete on programmes.episode_on_camera
  for each row execute function private.log_activity();

-- The release link: F-15, single use, to the person's address (a member's
-- account address, or the guest's), sent by Media from the episode's page.
create function private.episode_release_link(on_camera uuid, sent_to text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_ programmes.episode_on_camera;
  episode programmes.episodes;
  address text;
  token text := encode(extensions.gen_random_bytes(24), 'hex');
  new_id uuid;
begin
  if not private.has_permission('content.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into row_ from programmes.episode_on_camera where id = on_camera for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if row_.release_id is not null then
    raise exception 'already_signed' using errcode = '22023';
  end if;
  select * into episode from programmes.episodes where id = row_.episode_id;
  address := lower(btrim(coalesce(
    (select u.email from auth.users u where u.id = row_.user_id),
    episode_release_link.sent_to, '')));
  if address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  insert into governance.form_links (form_key, sent_to, note, token_hash)
  values ('f15', address, left('Next Stop: ' || episode.title_en, 300),
    encode(extensions.digest(token, 'sha256'), 'hex'))
  returning id into new_id;
  update programmes.episode_on_camera set form_link_id = new_id where id = row_.id;
  perform private.enqueue('forms.link', jsonb_build_object(
    'link_id', new_id, 'token', token, 'form_key', 'f15'));
  return new_id;
end;
$$;

revoke all on function private.episode_release_link(uuid, text) from public, anon;
grant execute on function private.episode_release_link(uuid, text) to authenticated;

create function programmes.episode_release_link(on_camera uuid, sent_to text default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.episode_release_link(on_camera, sent_to) $$;

revoke all on function programmes.episode_release_link(uuid, text) from public, anon;
grant execute on function programmes.episode_release_link(uuid, text) to authenticated;

-- A used link records the release on its row.
create function private.release_signed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.submission_id is not null and old.submission_id is null and new.form_key = 'f15' then
    update programmes.episode_on_camera
    set release_id = new.submission_id
    where form_link_id = new.id and release_id is null;
  end if;
  return new;
end;
$$;
revoke all on function private.release_signed() from public, anon, authenticated;

create trigger release_signed after update of submission_id on governance.form_links
  for each row execute function private.release_signed();

create or replace function private.sign_form(form_key text, data jsonb, signer_name text, subject_id uuid DEFAULT NULL::uuid, signer_contact text DEFAULT NULL::text, anonymous boolean DEFAULT false, routing text DEFAULT 'none'::text, esign_agreed boolean DEFAULT false, link_token text DEFAULT NULL::text, signer_ip text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t governance.form_types;
  new_id uuid;
  via_api boolean := coalesce(auth.role(), '') = 'service_role';
  link governance.form_links;
  ip text;
begin
  select * into t from governance.form_types where key = sign_form.form_key;
  if not found or t.filled <> 'site' then
    raise exception 'unknown_form' using errcode = 'P0002';
  end if;
  -- Signed out, or anonymous: only through the API route (Turnstile, a
  -- limit per address).
  if (auth.uid() is null or anonymous) and not via_api then
    raise exception 'use_the_form_page' using errcode = '42501';
  end if;
  if auth.uid() is null and t.needs_account then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  if auth.uid() is not null and not private.may_submit_form(t.key) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if auth.uid() is null and not core.take_rate('forms:' || t.key, 60, 3600) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  if data is null or jsonb_typeof(data) <> 'object' or length(data::text) > 40000 then
    raise exception 'invalid_data' using errcode = '22023';
  end if;
  -- A concern sent without a name carries no signature either.
  if not anonymous then
    if char_length(btrim(coalesce(sign_form.signer_name, ''))) < 2 then
      raise exception 'signature_required' using errcode = '23514';
    end if;
    if not sign_form.esign_agreed then
      raise exception 'esign_agreement_required' using errcode = '23514';
    end if;
  end if;
  if anonymous and not t.anonymous_ok then
    raise exception 'anonymous_not_allowed' using errcode = '22023';
  end if;
  if coalesce(routing, 'none') <> 'none' and t.key <> 'f21' then
    raise exception 'routing_only_for_concerns' using errcode = '22023';
  end if;
  if t.subject_kind = 'event' and t.key = 'f45' and not exists (
    select 1 from events.events e
    where e.id = sign_form.subject_id and e.off_campus and e.status = 'published'
      and private.can_see_event_id(e.id)
  ) then
    raise exception 'not_a_trip' using errcode = '22023';
  end if;
  -- A link-only form needs its link; any form given a link uses it once
  -- (a guest's F-15 release for a Next Stop episode).
  if t.by_link or sign_form.link_token is not null then
    select * into link from governance.form_links l
    where l.form_key = t.key
      and l.token_hash = encode(extensions.digest(coalesce(sign_form.link_token, ''), 'sha256'), 'hex')
      and l.used_at is null and l.expires_at > now()
    for update;
    if not found then
      raise exception 'link_not_valid' using errcode = '42501';
    end if;
  end if;

  -- The IP: given by the API route, or read from the request.
  ip := case when via_api then sign_form.signer_ip else split_part(coalesce(
    (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1) end;

  insert into governance.form_submissions (
    form_key, submitted_by, routing, data, status, submitted_at, form_version,
    signer_name, signed_at, signer_contact, subject_id,
    esign_agreed, signer_ip, document_sha256
  ) values (
    t.key,
    case when anonymous then null else auth.uid() end,
    coalesce(routing, 'none'),
    data,
    'submitted',
    now(),
    t.version,
    case when anonymous then null else btrim(sign_form.signer_name) end,
    now(),
    nullif(btrim(coalesce(sign_form.signer_contact, '')), ''),
    sign_form.subject_id,
    not anonymous and sign_form.esign_agreed,
    case when anonymous then null else nullif(btrim(coalesce(ip, '')), '') end,
    encode(extensions.digest(jsonb_build_object(
      'form', t.code, 'version', t.version, 'data', data,
      'signer', case when anonymous then null else btrim(sign_form.signer_name) end
    )::text, 'sha256'), 'hex')
  )
  returning id into new_id;

  if link.id is not null then
    update governance.form_links set used_at = now(), submission_id = new_id where id = link.id;
  end if;
  -- The signer's copy by email (an anonymous concern sends none).
  if not anonymous then
    perform private.enqueue('forms.signed_copy', jsonb_build_object('submission_id', new_id));
  end if;
  return new_id;
end;
$function$;

-- ── 3. No release, no episode ───────────────────────────────────────────────

create function private.episode_releases_signed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is not null
    and (tg_op = 'INSERT' or old.published_at is null)
    and (
      not exists (select 1 from programmes.episode_on_camera c where c.episode_id = new.id)
      or exists (select 1 from programmes.episode_on_camera c
                 where c.episode_id = new.id and c.release_id is null)
    ) then
    raise exception 'releases_missing' using errcode = '23514',
      hint = 'Everyone on camera signs F-15 before the episode is published.';
  end if;
  return new;
end;
$$;
revoke all on function private.episode_releases_signed() from public, anon, authenticated;

create trigger episode_releases_signed before insert or update of published_at on programmes.episodes
  for each row execute function private.episode_releases_signed();

-- ── 4. Credits ──────────────────────────────────────────────────────────────

alter table access.role_assignments
  add column credit text check (credit in (
    'directed_by', 'produced_by', 'host', 'director_of_photography',
    'edited_by', 'original_music', 'title_design'));

comment on column access.role_assignments.credit is
  'For Next Stop crew on an episode: the credit it earns, in the American order (decisions.md, Brand and design: Video).';

-- The credits in order: Directed by, Produced by, Host, Guests, Director of
-- Photography, Edited by, Original Music, Title Design. The standing
-- producer and host are credited when the episode names none.
create function private.episode_credits(episode uuid)
returns table (credit text, credit_order integer, name_en text, name_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  with e as (
    select x.id from programmes.episodes x
    where x.id = episode_credits.episode
      and ((x.published_at is not null and x.published_at <= now())
        or private.has_permission('content.manage'))
  ),
  scoped as (
    select a.credit, p.full_name_en, p.full_name_ar, a.created_at
    from access.role_assignments a
    join e on a.scope_type = 'episode' and a.scope_id = e.id
    join core.profiles p on p.id = a.user_id
    where a.role = 'next_stop_crew' and a.credit is not null
      and (a.ends_at is null or a.ends_at > now())
  ),
  standing as (
    select case a.role when 'next_stop_producer' then 'produced_by' else 'host' end as credit,
      p.full_name_en, p.full_name_ar, a.created_at
    from access.role_assignments a
    join core.profiles p on p.id = a.user_id
    where a.role in ('next_stop_producer', 'next_stop_host') and a.scope_type = 'global'
      and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
      and exists (select 1 from e)
  ),
  guests as (
    select 'guests'::text as credit,
      coalesce(p.full_name_en, c.guest_name_en) as full_name_en,
      coalesce(p.full_name_ar, c.guest_name_ar, c.guest_name_en) as full_name_ar,
      c.created_at
    from programmes.episode_on_camera c
    join e on e.id = c.episode_id
    left join core.profiles p on p.id = c.user_id
    where c.is_guest
  ),
  everyone as (
    select * from scoped
    union all
    select s.* from standing s
    where not exists (select 1 from scoped x where x.credit = s.credit)
    union all
    select * from guests
  )
  select credit,
    array_position(array['directed_by', 'produced_by', 'host', 'guests',
      'director_of_photography', 'edited_by', 'original_music', 'title_design'], credit),
    full_name_en, full_name_ar
  from everyone
  order by 2, created_at;
$$;

revoke all on function private.episode_credits(uuid) from public;
grant execute on function private.episode_credits(uuid) to anon, authenticated;

create function programmes.episode_credits(episode uuid)
returns table (credit text, credit_order integer, name_en text, name_ar text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.episode_credits(episode) $$;

revoke all on function programmes.episode_credits(uuid) from public;
grant execute on function programmes.episode_credits(uuid) to anon, authenticated;

-- ── 5. The kit's video files ────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-kit', 'brand-kit', false, 524288000,
  array['video/mp4', 'video/quicktime', 'audio/wav', 'audio/x-wav', 'image/png', 'application/zip'])
on conflict (id) do nothing;

-- Media names the crew of an episode with their credit: a Next Stop crew
-- role scoped to that episode, which ends with it (decisions.md, Get
-- involved and roles). Only this role and scope; every other role still
-- goes through access.assign_role.
create function private.credit_episode(episode uuid, member uuid, credit text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.has_permission('content.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from programmes.episodes e where e.id = credit_episode.episode) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into access.role_assignments (user_id, role, scope_type, scope_id, credit, assigned_by)
  values (member, 'next_stop_crew', 'episode', credit_episode.episode, credit_episode.credit, auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function private.credit_episode(uuid, uuid, text) from public, anon;
grant execute on function private.credit_episode(uuid, uuid, text) to authenticated;

create function programmes.credit_episode(episode uuid, member uuid, credit text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.credit_episode(episode, member, credit) $$;

revoke all on function programmes.credit_episode(uuid, uuid, text) from public, anon;
grant execute on function programmes.credit_episode(uuid, uuid, text) to authenticated;
