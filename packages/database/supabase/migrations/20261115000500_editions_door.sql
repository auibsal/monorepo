-- Editions is the one door for outside work (decisions.md, Qirtas: "Two
-- lanes", "Calls"):
--
-- 1. Every submission belongs to an Edition's call. Each Edition has its
--    general submissions (always open for the next Edition) and may have a
--    themed call with its own dates and terms. The standing call becomes
--    Edition 1's general submissions, with the work already sent to it.
-- 2. Video takes members' films through the calls, not blind (a film shows
--    its makers): up to 15 minutes, captions, and a media release for
--    everyone on screen.
-- 3. Voices opens to members and guests: a letter to the editor (up to 300
--    words) and a guest op-ed (600–800 words), never blind, sent to no
--    call and decided by the Voices desk. Opinion and News run under the
--    writer's own name; an op-ed ends with the line about its writer.
-- 4. News takes no submissions.

-- ── 1. Calls belong to Editions ─────────────────────────────────────────
alter table journal.calls
  add column kind text not null default 'themed'
    check (kind in ('general', 'themed'));

comment on column journal.calls.kind is
  'general (an Edition''s general submissions, always open) or themed (a themed call with its own dates and terms) (decisions.md, Qirtas).';

-- Edition 1, which the general submissions are for.
insert into journal.issues (volume, number, slug, title_en, title_ar, status)
values (1, 1, 'edition-1', 'Edition 1', 'الإصدار 1', 'draft')
on conflict (slug) do nothing;

-- The standing call becomes Edition 1's general submissions, and takes Video.
alter table journal.calls drop constraint calls_desks_check;
update journal.calls
set issue_id = (select id from journal.issues where slug = 'edition-1'),
  kind = 'general',
  title_en = 'Edition 1: general submissions',
  title_ar = 'الإصدار 1: المشاركات العامة',
  desks = '{letters,gallery,video}'
where issue_id is null;

-- Haven's call by its theme, as it is listed under Open now.
update journal.calls c
set title_en = 'Haven: dreams and memories', title_ar = 'ملاذ: أحلام وذكريات'
from journal.issues i
where i.id = c.issue_id and i.slug = 'haven' and c.kind = 'themed';

-- The blind copies of work already in reading follow their call.
update journal.blind_entries b
set issue_id = c.issue_id
from journal.calls c
where c.id = b.call_id and b.issue_id is distinct from c.issue_id;

drop index journal.calls_one_standing;
alter table journal.calls
  alter column issue_id set not null,
  add constraint calls_desks_check check (
    cardinality(desks) > 0 and desks <@ '{letters,gallery,video}'::journal.desk[]
  );
-- One general submissions per Edition.
create unique index calls_one_general on journal.calls (issue_id) where kind = 'general';

-- The Edition's calls are set on its page in the Diwan, by Qirtas's managers.
create policy "Journal managers add calls" on journal.calls
  for insert to authenticated
  with check ((select private.has_permission('journal.manage', 'issue', issue_id)));

-- ── 2 and 3. What a submission declares ─────────────────────────────────
alter table journal.submissions
  add column captions_confirmed boolean,
  add column release_confirmed boolean,
  add column running_minutes integer check (running_minutes between 1 and 15),
  add column about_writer text check (char_length(about_writer) between 3 and 160);

grant insert (captions_confirmed, release_confirmed, running_minutes, about_writer)
  on journal.submissions to authenticated;
grant update (about_writer) on journal.submissions to authenticated;

comment on column journal.submissions.about_writer is
  'An op-ed''s line about its writer, after their name: "is a junior studying business at AUIB" (decisions.md, Qirtas).';

-- The words in a piece of rich text, for Voices' limits.
create function private.html_word_count(html text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when t = '' then 0 else array_length(regexp_split_to_array(t, '\s+'), 1) end
  from (select btrim(regexp_replace(regexp_replace(coalesce(html, ''), '<[^>]+>', ' ', 'g'),
    '&[a-z#0-9]+;', ' ', 'gi')) as t) x;
$$;
revoke all on function private.html_word_count(text) from public, anon;
grant execute on function private.html_word_count(text) to authenticated, service_role;

create or replace function private.before_submission_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c journal.calls;
  existing integer;
  recent integer;
  since timestamptz;
  words integer;
  desk journal.desk := journal.desk_of(new.category);
begin
  -- Serialize submissions per author so the counts below can't race.
  perform pg_advisory_xact_lock(hashtext('journal.submissions:' || new.author_id::text));

  -- Six Words come only from the Typewriter Tour, transcribed by officers.
  if new.category = 'six_words' then
    raise exception 'six_words_on_tour' using errcode = '22023';
  end if;
  if not journal.is_current_category(new.category) then
    raise exception 'category_retired' using errcode = '22023';
  end if;

  -- Games come from the editors and the site, never from a member.
  if desk = 'games' then
    raise exception 'games_by_editors' using errcode = '22023';
  end if;
  -- News takes no submissions: tips go to tips@, reporters join the staff.
  if desk = 'news' then
    raise exception 'news_takes_tips' using errcode = '22023';
  end if;

  -- Opinion from anyone: a letter to the editor or an op-ed, to no call,
  -- under the writer's own name, decided by the Voices desk.
  if desk = 'voices' then
    if new.category not in ('letter_to_editor', 'opinion_essay') then
      raise exception 'voices_letters_and_op_eds' using errcode = '22023';
    end if;
    if new.pen_name is not null or new.anonymous then
      raise exception 'own_name_required' using errcode = '22023';
    end if;
    new.call_id := null;
    new.partner_id := null;
    words := private.html_word_count(new.body_html);
    if new.category = 'letter_to_editor' and words > 300 then
      raise exception 'letter_too_long' using errcode = '23514';
    end if;
    if new.category = 'opinion_essay' then
      if words < 600 or words > 800 then
        raise exception 'op_ed_length' using errcode = '23514';
      end if;
      if new.about_writer is null then
        raise exception 'about_writer_required' using errcode = '23514';
      end if;
    end if;
    if private.is_desk_editor('voices') then
      raise exception 'desk_editor_cannot_submit' using errcode = '42501';
    end if;
  else
    -- Edition work: the call named, or the open general submissions of the
    -- next Edition.
    if new.call_id is null then
      select c2.id into new.call_id
      from journal.calls c2
      join journal.issues i on i.id = c2.issue_id
      where c2.kind = 'general' and c2.is_published
        and now() between c2.opens_at and c2.closes_at
      order by i.volume, i.number nulls last
      limit 1;
    end if;
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

    -- A film: its link, its length, captions and everyone's release.
    if desk = 'video' and (
      new.video_url is null or new.running_minutes is null
      or not coalesce(new.captions_confirmed, false)
      or not coalesce(new.release_confirmed, false)
    ) then
      raise exception 'video_declarations' using errcode = '23514';
    end if;

    -- Conflicts and staff work: the Editor-in-Chief, Managing Editor and
    -- Submissions Manager do not submit while in office, and no one submits
    -- to a section they edit. Staff write in the newsroom instead.
    if access.has_permission('journal.approve', 'issue', c.issue_id)
       or access.has_permission('journal.identity.view', 'issue', c.issue_id) then
      raise exception 'staff_cannot_submit' using errcode = '42501';
    end if;
    if access.has_permission('journal.edit.' || desk::text, 'issue', c.issue_id) then
      raise exception 'desk_editor_cannot_submit' using errcode = '42501';
    end if;

    -- A themed call counts everything sent to it; general submissions
    -- count this semester's.
    since := case when c.kind = 'general'
      then coalesce((select t.starts_on::timestamptz from core.current_term() t), now() - interval '120 days')
      else '-infinity'::timestamptz end;
    select count(*) into existing from journal.submissions s
    where s.call_id = new.call_id and s.author_id = new.author_id
      and s.status <> 'withdrawn' and s.created_at >= since;
    if existing >= c.max_per_person then
      raise exception 'You can send at most % submissions to this call', c.max_per_person
        using errcode = '23514';
    end if;
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
$$;

-- ── The calls, with their Editions, for the public pages ────────────────
-- An Edition's page lives at one address for its whole life: while its
-- call is open (the Edition still a draft), then "Reading now", then the
-- book. The published calls and the Edition each belongs to are public.
create function private.edition_calls(edition_slug text default null)
returns table (
  id uuid, kind text, title_en text, title_ar text, theme_en text, theme_ar text,
  eligibility_en text, eligibility_ar text, opens_at timestamptz, closes_at timestamptz,
  decisions_at timestamptz, desks journal.desk[], max_per_person integer,
  edition_id uuid, edition_slug text, edition_title_en text, edition_title_ar text,
  edition_theme_en text, edition_theme_ar text, edition_status text,
  edition_publish_at timestamptz, edition_pilot boolean, edition_number integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.title_en, c.title_ar, c.theme_en, c.theme_ar,
    c.eligibility_en, c.eligibility_ar, c.opens_at, c.closes_at, c.decisions_at,
    c.desks, c.max_per_person, i.id, i.slug, i.title_en, i.title_ar, i.theme_en,
    i.theme_ar, i.status, i.publish_at, i.pilot, i.number
  from journal.calls c
  join journal.issues i on i.id = c.issue_id
  where c.is_published
    and (edition_calls.edition_slug is null or i.slug = edition_calls.edition_slug)
  -- The themed call first, then the general submissions; the soonest first.
  order by (c.kind = 'themed') desc, c.closes_at;
$$;
revoke all on function private.edition_calls(text) from public;
grant execute on function private.edition_calls(text) to anon, authenticated, service_role;

create function journal.edition_calls(edition_slug text default null)
returns table (
  id uuid, kind text, title_en text, title_ar text, theme_en text, theme_ar text,
  eligibility_en text, eligibility_ar text, opens_at timestamptz, closes_at timestamptz,
  decisions_at timestamptz, desks journal.desk[], max_per_person integer,
  edition_id uuid, edition_slug text, edition_title_en text, edition_title_ar text,
  edition_theme_en text, edition_theme_ar text, edition_status text,
  edition_publish_at timestamptz, edition_pilot boolean, edition_number integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.edition_calls(edition_slug) $$;
revoke all on function journal.edition_calls(text) from public;
grant execute on function journal.edition_calls(text) to anon, authenticated, service_role;

-- ── The reading queue, by call ──────────────────────────────────────────
-- Diwan → Qirtas → Editions opens on one reading queue, filtered by Edition
-- and call: the intake rows carry their call.
drop function journal.intake_queue(uuid);
drop function private.intake_queue(uuid);

create function private.intake_queue(issue_id uuid)
returns table (
  submission_id uuid, blind_entry_id uuid, call_id uuid, title text,
  category journal.category, language journal.language,
  status journal.submission_status, author_name_en text, author_name_ar text,
  file_count integer, intake_note text, intake_returned_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_view_identity(intake_queue.issue_id) then
    raise exception 'journal.identity.view is required' using errcode = '42501';
  end if;

  return query
    select s.id, k.blind_entry_id, s.call_id, s.title, s.category, s.language, s.status,
      p.full_name_en, p.full_name_ar,
      (select count(*)::integer from journal.submission_files f where f.submission_id = s.id),
      s.intake_note, s.intake_returned_at, s.created_at, s.updated_at
    from journal.submissions s
    join journal.calls c on c.id = s.call_id
    left join journal.blind_keys k on k.submission_id = s.id
    left join core.profiles p on p.id = s.author_id
    where c.issue_id = intake_queue.issue_id
    order by s.created_at;
end;
$$;
revoke all on function private.intake_queue(uuid) from public, anon;
grant execute on function private.intake_queue(uuid) to authenticated, service_role;

create function journal.intake_queue(issue_id uuid)
returns table (
  submission_id uuid, blind_entry_id uuid, call_id uuid, title text,
  category journal.category, language journal.language,
  status journal.submission_status, author_name_en text, author_name_ar text,
  file_count integer, intake_note text, intake_returned_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
language sql
stable
set search_path = ''
as $$ select * from private.intake_queue($1) $$;
revoke all on function journal.intake_queue(uuid) from public, anon;
grant execute on function journal.intake_queue(uuid) to authenticated, service_role;

-- ── Hudhud: a last call and a published Edition ────────────────────────
-- Each posts once to the members' group (decisions.md, Hudhud).
alter table core.telegram_posts drop constraint telegram_posts_kind_check;
alter table core.telegram_posts add constraint telegram_posts_kind_check check (kind = any (array[
  'event', 'event_soon', 'piece', 'word', 'brief', 'event_summary', 'announcement',
  'sunday_note', 'paper', 'stream', 'alert', 'description', 'doors', 'vote_open',
  'vote_closing', 'last_call', 'edition'
]));

-- ── Check: no submission is left without its Edition's call ─────────────
do $$
begin
  if exists (
    select 1 from journal.submissions s
    left join journal.calls c on c.id = s.call_id
    where (s.call_id is null and s.desk not in ('voices', 'news'))
       or (s.call_id is not null and c.issue_id is null)
  ) then
    raise exception 'a submission has no Edition call';
  end if;
end;
$$;
