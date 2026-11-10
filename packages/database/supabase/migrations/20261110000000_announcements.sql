-- Announcements (decisions §17): one notice written once in English and
-- Arabic and sent on the President's go, after its test has reached the
-- President, as one Resend Broadcast per language (to the Sunday Paper's
-- readers: members who take optional emails and the public list) and
-- through Hudhud (the members' group's Announcements topic and the chats
-- of linked members who keep notices on). The first is a draft of Haven's
-- call (decisions §14), in the poster's words, for the President to check.

create table core.announcements (
  id uuid primary key default gen_random_uuid(),
  title_en text not null check (char_length(btrim(title_en)) between 1 and 120),
  title_ar text not null check (char_length(btrim(title_ar)) between 1 and 120),
  body_en text not null check (char_length(btrim(body_en)) between 1 and 2000),
  body_ar text not null check (char_length(btrim(body_ar)) between 1 and 2000),
  -- A page on the site the notice points to, as its path ("/qirtas/write").
  link_path text check (link_path ~ '^/[a-z0-9/_-]*$' and char_length(link_path) <= 200),
  tested_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_created_by_idx on core.announcements (created_by);

alter table core.announcements enable row level security;

create policy "No third-party apps" on core.announcements
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

-- The President writes and sends them; changes go through the functions.
create policy "The President reads the announcements" on core.announcements
  for select to authenticated
  using ((select access.has_permission('roles.assign')) and (select access.has_permission('governance.manage')));

comment on table core.announcements is
  'Announcements (decisions §17): written in English and Arabic, tested on the President (tested_at, by /api/announcements/test), sent once on the President''s go (sent_at) as a Resend Broadcast per language and through Hudhud.';

revoke all on core.announcements from anon, authenticated;
grant select on core.announcements to authenticated;
grant all on core.announcements to service_role;

-- Saves a notice not yet sent: a new one when no id is given. Any change
-- clears its test, so what is sent is always what the President read.
create function private.save_announcement(
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
  if not (access.has_permission('roles.assign') and access.has_permission('governance.manage')) then
    raise exception 'The President sends the announcements' using errcode = '42501';
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

revoke all on function private.save_announcement(text, text, text, text, text, uuid) from public, anon;
grant execute on function private.save_announcement(text, text, text, text, text, uuid) to authenticated;

create function core.save_announcement(
  title_en text,
  title_ar text,
  body_en text,
  body_ar text,
  link_path text default null,
  id uuid default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.save_announcement(title_en, title_ar, body_en, body_ar, link_path, id) $$;

revoke all on function core.save_announcement(text, text, text, text, text, uuid) from public, anon;
grant execute on function core.save_announcement(text, text, text, text, text, uuid) to authenticated;

-- The President's go, after the test reached the President. A notice is
-- sent once: the email job goes in the outbox, and Hudhud's next run posts
-- it (it reads sent_at).
create function private.send_announcement(id uuid)
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
  update core.announcements n set sent_at = now() where n.id = a.id;
  perform private.enqueue('announcement.broadcast', jsonb_build_object('id', a.id));
  return true;
end;
$$;

revoke all on function private.send_announcement(uuid) from public, anon;
grant execute on function private.send_announcement(uuid) to authenticated;

create function core.send_announcement(id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.send_announcement(id) $$;

revoke all on function core.send_announcement(uuid) from public, anon;
grant execute on function core.send_announcement(uuid) to authenticated;

-- The Broadcast and Hudhud keep their progress under the new kind.
alter table core.broadcasts drop constraint broadcasts_kind_check;
alter table core.broadcasts add constraint broadcasts_kind_check
  check (kind = any (array['sunday_paper', 'invitation', 'announcement']));

alter table core.telegram_posts drop constraint telegram_posts_kind_check;
alter table core.telegram_posts add constraint telegram_posts_kind_check
  check (kind = any (array['event', 'event_soon', 'piece', 'word', 'brief', 'event_summary', 'announcement']));

-- Hudhud's private messages: one row per member's chat a notice reached,
-- claimed before it is sent so overlapping runs never send it twice.
create table core.announcement_deliveries (
  announcement_id uuid not null references core.announcements (id) on delete cascade,
  telegram_id bigint not null,
  sent_at timestamptz not null default now(),
  primary key (announcement_id, telegram_id)
);

alter table core.announcement_deliveries enable row level security;

create policy "No third-party apps" on core.announcement_deliveries
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

comment on table core.announcement_deliveries is
  'Which linked members'' chats Hudhud sent an announcement to (decisions §17); read and written only by the API routes.';

revoke all on core.announcement_deliveries from anon, authenticated;
grant all on core.announcement_deliveries to service_role;

-- Haven's call (decisions §14), in the poster's words, as a draft.
insert into core.announcements (title_en, title_ar, body_en, body_ar, link_path)
values (
  'Haven: write for Qirtas''s pilot issue',
  '«ملاذ»: اكتب للعدد التجريبي من «قرطاس»',
  E'Our memories and dreams are the most intimate parts of ourselves. Each of us holds a memory from childhood, or a dream close to the heart, that refuses to die.\n\nShare a piece of your own: a poem, a short story, a creative essay, or an artwork. Let it be about a core memory, a dream, or both, seen through your own eyes, and be one of the contributors to the first issue of Qirtas, AUIB’s paper of news, letters and art.\n\nSubmit your work now at auibsal.org/qirtas/write.',
  E'ذكرياتنا وأحلامنا أقرب ما فينا إلى أنفسنا؛ فلكلٍّ منّا ذكرى من طفولته، أو حلمٌ عزيز على قلبه يأبى أن يموت.\n\nشاركنا عملًا من إبداعك: قصيدةً، أو قصةً قصيرة، أو مقالةً إبداعية، أو عملًا فنيًّا. اجعله عن ذكرى راسخة، أو عن حلم، أو عنهما معًا، كما تراهما بعينك، وكن من المساهمين في العدد الأول من «قرطاس»، صحيفة الجامعة للأخبار والآداب والفنون.\n\nأرسل عملك الآن عبر auibsal.org/ar/qirtas/write.',
  '/qirtas/write'
);
