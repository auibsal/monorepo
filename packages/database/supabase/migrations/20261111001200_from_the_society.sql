-- "From the Society" (decisions.md, Qirtas): the Society's notices in their
-- own stream on Qirtas's front page, owned by Media. A notice shows in the
-- stream from the date it carries (shown_at): the President's email sets it
-- when sent, and Media can post a notice to the stream with a date and no
-- email, as with the two notices dated Nov 8.

alter table core.announcements add column shown_at timestamptz;

comment on column core.announcements.shown_at is
  'When the notice shows in "From the Society", and the date it carries there: set when the President sends it, or when Media posts it to the stream without an email.';

update core.announcements set shown_at = sent_at where sent_at is not null and shown_at is null;

-- Media (content.manage) writes and reads the notices beside the President.
create or replace function private.may_write_notices()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (access.has_permission('roles.assign') and access.has_permission('governance.manage'))
    or access.has_permission('content.manage');
$$;

revoke all on function private.may_write_notices() from public, anon;
grant execute on function private.may_write_notices() to authenticated, service_role;

drop policy "The President reads the announcements" on core.announcements;
create policy "The President and Media read the announcements" on core.announcements
  for select to authenticated
  using ((select private.may_write_notices()));

create or replace function private.save_announcement(
  title_en text,
  title_ar text,
  body_en text,
  body_ar text,
  link_path text default null,
  id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved uuid;
begin
  if not private.may_write_notices() then
    raise exception 'The President and Media write the notices' using errcode = '42501';
  end if;
  if save_announcement.id is null then
    insert into core.announcements (title_en, title_ar, body_en, body_ar, link_path, created_by)
    values (btrim(title_en), btrim(title_ar), btrim(body_en), btrim(body_ar),
      nullif(btrim(coalesce(link_path, '')), ''), auth.uid())
    returning announcements.id into saved;
    return saved;
  end if;
  update core.announcements a set
    title_en = btrim(save_announcement.title_en),
    title_ar = btrim(save_announcement.title_ar),
    body_en = btrim(save_announcement.body_en),
    body_ar = btrim(save_announcement.body_ar),
    link_path = nullif(btrim(coalesce(save_announcement.link_path, '')), ''),
    tested_at = null,
    updated_at = now()
  where a.id = save_announcement.id and a.sent_at is null
  returning a.id into saved;
  if saved is null then
    raise exception 'announcement_closed' using errcode = 'P0001',
      hint = 'A notice can be changed only until it is sent.';
  end if;
  return saved;
end;
$$;

-- The President's email also puts the notice in the stream.
create or replace function private.send_announcement(id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  a core.announcements;
begin
  if not (access.has_permission('roles.assign') and access.has_permission('governance.manage')) then
    raise exception 'The President sends the announcements' using errcode = '42501';
  end if;
  select * into a from core.announcements n where n.id = send_announcement.id for update;
  if not found or a.sent_at is not null then
    return false;
  end if;
  if a.tested_at is null then
    raise exception 'announcement_untested' using errcode = 'P0001',
      hint = 'Send the test to the President first.';
  end if;
  update core.announcements n set sent_at = now(), shown_at = coalesce(n.shown_at, now())
  where n.id = a.id;
  perform private.enqueue('announcement.broadcast', jsonb_build_object('id', a.id));
  return true;
end;
$$;

-- Posts a notice to the stream with the date it carries (today or
-- earlier), or takes it down with null, and sends no email.
create function private.post_notice(id uuid, shown_at timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  posted timestamptz;
begin
  if not private.may_write_notices() then
    raise exception 'The President and Media post the notices' using errcode = '42501';
  end if;
  if post_notice.shown_at is not null and post_notice.shown_at > now() then
    raise exception 'A notice is posted today or with an earlier date' using errcode = '22023';
  end if;
  update core.announcements a set shown_at = post_notice.shown_at, updated_at = now()
  where a.id = post_notice.id
  returning a.shown_at into posted;
  if not found then
    raise exception 'Notice not found' using errcode = 'P0002';
  end if;
  return posted;
end;
$$;

create function core.post_notice(id uuid, shown_at timestamptz)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.post_notice(id, shown_at) $$;

comment on function core.post_notice(uuid, timestamptz) is
  'Puts a notice in "From the Society" with the date it carries (today or earlier), or takes it out with null; no email is sent.';

revoke all on function private.post_notice(uuid, timestamptz) from public, anon;
revoke all on function core.post_notice(uuid, timestamptz) from public, anon;
grant execute on function private.post_notice(uuid, timestamptz) to authenticated, service_role;
grant execute on function core.post_notice(uuid, timestamptz) to authenticated;

-- The stream: what shows, by the date it carries.
drop function core.society_notices(integer);
drop function private.society_notices(integer);

create function private.society_notices(max_results integer default 5)
returns table (
  id uuid,
  title_en text,
  title_ar text,
  body_en text,
  body_ar text,
  link_path text,
  shown_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.title_en, a.title_ar, a.body_en, a.body_ar, a.link_path, a.shown_at
  from core.announcements a
  where a.shown_at is not null and a.shown_at <= now()
  order by a.shown_at desc
  limit least(greatest(max_results, 1), 50);
$$;

create function core.society_notices(max_results integer default 5)
returns table (
  id uuid,
  title_en text,
  title_ar text,
  body_en text,
  body_ar text,
  link_path text,
  shown_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.society_notices(max_results);
$$;

comment on function core.society_notices(integer) is
  'The Society''s notices in "From the Society", newest first by the date each carries (decisions.md, Qirtas).';

revoke all on function private.society_notices(integer) from public;
revoke all on function core.society_notices(integer) from public;
grant execute on function private.society_notices(integer) to anon, authenticated, service_role;
grant execute on function core.society_notices(integer) to anon, authenticated, service_role;

-- Qirtas's front page refreshes when a notice changes.
create trigger announcements_revalidate
after insert or update or delete on core.announcements
for each statement execute function private.queue_revalidation('journal');
