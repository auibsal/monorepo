-- The Diwan in three rooms (owner, Nov 4, 2026): Notion is the work, the
-- site keeps people and private records, Telegram is the talk. Every piece
-- of information has one home; anywhere else it appears is a read-only view.
--
-- In Notion, programs, documents and minutes are now written there and
-- published to the site (apps/web/lib/api/notion: programs.ts,
-- documents.ts, minutes.ts); an Arabic edition is its own row. This
-- migration gives the sync what it needs and puts the officers on record.

-- ── The sync ────────────────────────────────────────────────────────────────

-- Arabic editions are linked to the record their English row stands for.
alter table core.notion_links drop constraint notion_links_kind_check;
alter table core.notion_links add constraint notion_links_kind_check
  check (kind in (
    'event', 'event_ar', 'news', 'officer', 'programme', 'programme_ar',
    'document', 'minutes', 'journal_stage', 'piece'
  ));

-- Minutes come from Work, Meetings.
update core.settings
set value = value || jsonb_build_object('meetings', '3da5ed6a-c061-42e3-b081-748c52e2377d')
where key = 'notion.data_sources';

-- ── Adopted minutes are the official copy ───────────────────────────────────

create function private.lock_adopted_minutes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'adopted' and (
    new.status is distinct from old.status
    or new.adopted_on is distinct from old.adopted_on
    or new.text_en is distinct from old.text_en
    or new.text_ar is distinct from old.text_ar
    or new.title_en is distinct from old.title_en
    or new.title_ar is distinct from old.title_ar
    or new.meeting_on is distinct from old.meeting_on
    or new.body is distinct from old.body
  ) then
    raise exception 'Adopted minutes are the official copy and cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function private.lock_adopted_minutes() from public, anon, authenticated;

create trigger lock_adopted_minutes before update on governance.minutes
  for each row execute function private.lock_adopted_minutes();

-- ── Officers: each seat by its full title ──────────────────────────────────
-- A director's assignment carries the seat's title (Editor of Qirtas,
-- Director of Media, …); the directory shows that title, else the role.

create or replace function access.officer_directory()
returns table (
  user_id uuid, email text, full_name_en text, full_name_ar text, roles text[],
  council boolean, term_starts timestamptz, term_ends timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.user_id,
    u.email::text,
    p.full_name_en,
    p.full_name_ar,
    array_agg(distinct coalesce(nullif(btrim(a.title_en), ''), r.name_en)
      order by coalesce(nullif(btrim(a.title_en), ''), r.name_en)),
    bool_or(r.is_council),
    min(a.starts_at),
    case when bool_or(a.ends_at is null) then null else max(a.ends_at) end
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join auth.users u on u.id = a.user_id
  left join core.profiles p on p.id = a.user_id
  where a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
    and a.role not in ('partner_rep', 'partner_lead')
  group by a.user_id, u.email, p.full_name_en, p.full_name_ar;
$$;

-- ── The officers on record (decisions, section 3) ──────────────────────────
-- By account, so these change nothing where the accounts do not exist.
-- Names are written in their parts; the short form (first and last) follows.

-- The Vice President: Fajer Saif Khalid Ezzet (Fajer Ezzet).
update core.profiles
set first_name_en = 'Fajer',
    father_name_en = 'Saif',
    grandfather_name_en = 'Khalid',
    last_name_en = 'Ezzet'
where id = '01d7e1c2-f476-4a6e-8cb0-63b13be2d1fa';

-- The Editor of Qirtas: Mohammed-Ali Ehsan Ohmaid (Mohammed-Ali Ohmaid).
-- His grandfather's name is not on record and stays as he gave it.
update core.profiles
set first_name_en = 'Mohammed-Ali',
    father_name_en = 'Ehsan',
    last_name_en = 'Ohmaid'
where id = '9fbe017b-1330-4bfa-bc42-fb0941e2330c';

-- He holds the Editor of Qirtas's Council seat (a director), beside the
-- Editor-in-Chief role that edits the paper.
insert into access.role_assignments (user_id, role, title_en, title_ar, note)
select p.id, 'director', 'Editor of Qirtas', 'رئيس تحرير قرطاس',
  'The Editor of Qirtas''s Council seat (decisions, section 3).'
from core.profiles p
where p.id = '9fbe017b-1330-4bfa-bc42-fb0941e2330c'
  and not exists (
    select 1 from access.role_assignments a
    where a.user_id = p.id and a.role = 'director'
      and (a.ends_at is null or a.ends_at > now())
  );

-- The Director of Media's seat, by its title.
update access.role_assignments
set title_en = 'Director of Media', title_ar = 'مدير الإعلام'
where user_id = 'ed44f849-75ff-4d26-9d5d-f9658166c5e2'
  and role = 'director'
  and nullif(btrim(title_en), '') is null;

-- ── Documents: the site keeps the adoption record ──────────────────────────
-- The text is written in Notion and rendered here by the sync; the Library
-- in the Diwan keeps when and how each document was adopted: the date
-- (adopted_on) and the vote, in a line ("Adopted by the General Assembly,
-- 41 for, 2 against"), both written back to the document's row in Notion.

alter table governance.society_documents
  add column vote text check (char_length(vote) <= 300);

comment on column governance.society_documents.vote is
  'The adoption vote, in one line; kept in the Diwan and written back to Notion.';
comment on column governance.society_documents.body_en is
  'Rendered from the document''s page in Notion by the sync; never edited here.';
