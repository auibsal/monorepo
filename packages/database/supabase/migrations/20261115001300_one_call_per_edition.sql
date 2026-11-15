-- One Edition, one title, one call (decisions.md, Qirtas; the US
-- literary-magazine standard). "General submissions" and themed calls go:
--
-- 1. Every Edition has a number, a season and a title (its theme), and
--    exactly one call for Letters, Gallery and Video. Haven is Edition 0
--    (the pilot, the US "Issue 0" convention); Edition 1 is spring 2027.
-- 2. Each Edition's call opens the day the previous one closes, so one call
--    is always open: Haven's closes Sun, Dec 6, and Edition 1's opens Mon,
--    Dec 7. Work sent after a deadline goes to the next Edition's call.
-- 3. An Edition's call can't open without its title (Edition 1's is
--    proposed by the Editor-in-Chief and approved by the owner; until then
--    the Desk shows it as a to-do). Edition 1's general submissions become
--    its one call, with the work already in it.
-- 4. Accepted Letters, Gallery and Video work is published with its
--    Edition, all together on the Edition's date, never piece by piece.

-- ── 1. Numbers: Haven is Edition 0 ──────────────────────────────────────
alter table journal.issues drop constraint issues_pilot_unnumbered;
alter table journal.issues drop constraint issues_number_check;
update journal.issues set number = 0 where pilot and number is null;
alter table journal.issues
  add constraint issues_number_check check (number >= 0),
  add constraint issues_pilot_is_edition_0 check (pilot = (number = 0));

comment on column journal.issues.pilot is
  'Edition 0, the pilot (Haven, fall 2026; the US "Issue 0" convention). Edition 1 is spring 2027 (decisions.md, Qirtas).';

-- /qirtas/editions/open is "Send your work", the open Edition's call.
alter table journal.issues add constraint issues_slug_not_open check (slug <> 'open');

-- ── The title is the theme, and can wait for approval ───────────────────
alter table journal.issues
  alter column title_en drop not null,
  alter column title_ar drop not null;

comment on column journal.issues.title_en is
  'The Edition''s title, which is its theme («عنوان الإصدار»), proposed by the Editor-in-Chief and approved by the owner before its call opens. Cited "Edition <n>: <title>, <season>".';

update journal.issues
set title_en = null, title_ar = null,
  season_en = coalesce(season_en, 'Spring 2027'),
  season_ar = coalesce(season_ar, 'ربيع 2027')
where slug = 'edition-1' and title_en = 'Edition 1';

-- "Edition <n>: <title>, <season>", or "Edition <n>, <season>" until titled.
create function private.edition_citation(issue journal.issues, lang text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when lang = 'ar'
    then 'الإصدار ' || issue.number
      || coalesce(': ' || issue.title_ar, '') || coalesce('، ' || issue.season_ar, '')
    else 'Edition ' || issue.number
      || coalesce(': ' || issue.title_en, '') || coalesce(', ' || issue.season_en, '')
  end;
$$;
revoke all on function private.edition_citation(journal.issues, text) from public;
grant execute on function private.edition_citation(journal.issues, text) to anon, authenticated, service_role;

-- ── 2. One call per Edition ─────────────────────────────────────────────
drop index journal.calls_one_general;
alter table journal.calls drop column kind;
create unique index calls_one_per_edition on journal.calls (issue_id);

comment on table journal.calls is
  'Each Edition''s one call, its reading period, for Letters, Gallery and Video (decisions.md, Qirtas). Its title is the Edition''s ("Edition 0: Haven"), kept by the site.';

-- The call's title is the Edition's, never typed.
create function private.call_title_from_edition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  e journal.issues;
begin
  select * into e from journal.issues where id = new.issue_id;
  new.title_en := 'Edition ' || e.number || coalesce(': ' || e.title_en, '');
  new.title_ar := 'الإصدار ' || e.number || coalesce(': ' || e.title_ar, '');
  -- Its call can't open without the Edition's title.
  if new.is_published and (e.title_en is null or e.title_ar is null) then
    raise exception 'edition_title_required' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.call_title_from_edition() from public, anon, authenticated;

create trigger call_title_from_edition before insert or update on journal.calls
  for each row execute function private.call_title_from_edition();

create function private.edition_titles_to_call()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.title_en is distinct from old.title_en or new.title_ar is distinct from old.title_ar
     or new.number is distinct from old.number then
    if (new.title_en is null or new.title_ar is null)
       and exists (select 1 from journal.calls c where c.issue_id = new.id and c.is_published) then
      raise exception 'edition_title_required' using errcode = '23514';
    end if;
    update journal.calls set updated_at = now() where issue_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.edition_titles_to_call() from public, anon, authenticated;

create trigger edition_titles_to_call after update on journal.issues
  for each row execute function private.edition_titles_to_call();

-- Edition 1's general submissions become its one call, with the work
-- already in it, opening the day Haven's closes; it stays unpublished
-- until the Edition has its title. Its deadline is set in the Diwan.
update journal.calls c
set opens_at = timestamptz '2026-12-07 00:00+03',
  is_published = false
from journal.issues i
where i.id = c.issue_id and i.slug = 'edition-1';

-- Haven's call takes its Edition's title.
update journal.calls c set updated_at = now()
from journal.issues i
where i.id = c.issue_id and i.slug = 'haven';

-- ── The submission goes to the open Edition's call ──────────────────────
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
    -- Edition work goes to the open Edition's call (decisions.md, Qirtas:
    -- one Edition, one call). The call named is kept while it is open;
    -- work sent after its deadline goes to the next Edition's call.
    select * into c from journal.calls c2
    where c2.id = new.call_id and c2.is_published
      and now() between c2.opens_at and c2.closes_at;
    if not found then
      select c2.* into c
      from journal.calls c2
      join journal.issues i on i.id = c2.issue_id
      where c2.is_published and now() between c2.opens_at and c2.closes_at
        and desk = any (c2.desks)
      order by c2.opens_at, i.volume, i.number
      limit 1;
    end if;
    if not found then
      raise exception 'no_open_call' using errcode = '22023';
    end if;
    if not (desk = any (c.desks)) then
      raise exception 'This call is not for % work', desk using errcode = '22023';
    end if;
    new.call_id := c.id;

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

    -- Everything sent to the call counts.
    select count(*) into existing from journal.submissions s
    where s.call_id = c.id and s.author_id = new.author_id
      and s.status <> 'withdrawn';
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

-- ── The calls for the public pages ──────────────────────────────────────
drop function journal.edition_calls(text);
drop function private.edition_calls(text);

create function private.edition_calls(edition_slug text default null)
returns table (
  id uuid, title_en text, title_ar text, theme_en text, theme_ar text,
  eligibility_en text, eligibility_ar text, opens_at timestamptz, closes_at timestamptz,
  decisions_at timestamptz, desks journal.desk[], max_per_person integer,
  edition_id uuid, edition_slug text, edition_title_en text, edition_title_ar text,
  edition_theme_en text, edition_theme_ar text, edition_status text,
  edition_publish_at timestamptz, edition_pilot boolean, edition_number integer,
  edition_season_en text, edition_season_ar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title_en, c.title_ar, c.theme_en, c.theme_ar,
    c.eligibility_en, c.eligibility_ar, c.opens_at, c.closes_at, c.decisions_at,
    c.desks, c.max_per_person, i.id, i.slug, i.title_en, i.title_ar, i.theme_en,
    i.theme_ar, i.status, i.publish_at, i.pilot, i.number, i.season_en, i.season_ar
  from journal.calls c
  join journal.issues i on i.id = c.issue_id
  where c.is_published
    and (edition_calls.edition_slug is null or i.slug = edition_calls.edition_slug)
  order by c.opens_at;
$$;
revoke all on function private.edition_calls(text) from public;
grant execute on function private.edition_calls(text) to anon, authenticated, service_role;

create function journal.edition_calls(edition_slug text default null)
returns table (
  id uuid, title_en text, title_ar text, theme_en text, theme_ar text,
  eligibility_en text, eligibility_ar text, opens_at timestamptz, closes_at timestamptz,
  decisions_at timestamptz, desks journal.desk[], max_per_person integer,
  edition_id uuid, edition_slug text, edition_title_en text, edition_title_ar text,
  edition_theme_en text, edition_theme_ar text, edition_status text,
  edition_publish_at timestamptz, edition_pilot boolean, edition_number integer,
  edition_season_en text, edition_season_ar text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.edition_calls(edition_slug) $$;
revoke all on function journal.edition_calls(text) from public;
grant execute on function journal.edition_calls(text) to anon, authenticated, service_role;

-- ── 4. Edition work comes out with its Edition ──────────────────────────
-- A piece accepted from an Edition's call (Letters, Gallery, Video); the
-- staff lane (News, Voices, staff Video) publishes as pieces are ready.
create function private.is_edition_work(piece uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from journal.pieces p
    join journal.submissions s on s.id = p.submission_id
    where p.id = piece and s.call_id is not null
  );
$$;
revoke all on function private.is_edition_work(uuid) from public, anon;
grant execute on function private.is_edition_work(uuid) to authenticated, service_role;

create or replace function private.try_publish(piece_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p journal.pieces;
  problem text;
  launch timestamptz;
  due timestamptz;
begin
  select * into p from journal.pieces where id = try_publish.piece_id for update;
  if not found or p.status in ('published', 'unpublished') then
    return p.status;
  end if;
  -- Only a piece whose author has approved it (or a staff piece) and whose
  -- required approvals are in is ready; until then nothing moves.
  if (p.submission_id is not null and p.author_approved_at is null)
     or exists (
       select 1 from unnest(private.required_approvals(p.desk)) needed
       where not exists (select 1 from journal.approvals a where a.piece_id = p.id and a.kind = needed)
     ) then
    return p.status;
  end if;

  problem := private.publish_check(p.id);
  if problem is not null then
    update journal.pieces set status = 'editing', edit_note = problem where id = p.id;
    return 'editing';
  end if;

  select i.publish_at into launch from journal.issues i where i.id = p.issue_id;
  -- Edition work comes out with its Edition, all together on its date
  -- (decisions.md, Qirtas: Publishing); until the Edition has a date it
  -- waits, approved. Only the staff lane publishes as pieces are ready.
  if private.is_edition_work(p.id) then
    if launch is null then
      return p.status;
    end if;
    due := launch;
  else
    due := coalesce(p.publish_at, launch, now());
  end if;
  if due > now() then
    update journal.pieces
    set status = 'scheduled', publish_at = due, edit_note = null
    where id = p.id;
    return 'scheduled';
  end if;

  update journal.pieces
  set status = 'published', published_at = coalesce(p.dated_at, now()),
      publish_at = coalesce(p.publish_at, now()), edit_note = null
  where id = p.id;
  perform private.enqueue('qirtas.piece_published', jsonb_build_object('piece_id', p.id));
  return 'published';
end;
$function$;

-- No hand publishes Edition work early: it is scheduled for its Edition's
-- date, or published once that date has come.
create or replace function private.before_piece_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  launch timestamptz;
begin
  if new.status in ('scheduled', 'published')
     and new.submission_id is not null
     and not exists (
       select 1 from journal.agreements a where a.submission_id = new.submission_id
     ) then
    raise exception 'The author has not signed the Publication Agreement'
      using errcode = '23514';
  end if;
  if new.status in ('scheduled', 'published') and new.submission_id is not null
     and exists (select 1 from journal.submissions s
                 where s.id = new.submission_id and s.call_id is not null) then
    select i.publish_at into launch from journal.issues i where i.id = new.issue_id;
    if launch is null
       or (new.status = 'published' and launch > now())
       or (new.status = 'scheduled' and new.publish_at is distinct from launch) then
      raise exception 'edition_work_with_its_edition' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

-- An Edition's new date moves its scheduled work with it.
create function private.edition_date_to_work()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publish_at is distinct from old.publish_at and new.publish_at is not null then
    update journal.pieces p
    set publish_at = new.publish_at
    where p.issue_id = new.id and p.status = 'scheduled'
      and private.is_edition_work(p.id);
  end if;
  return new;
end;
$$;
revoke all on function private.edition_date_to_work() from public, anon, authenticated;

create trigger edition_date_to_work after update of publish_at on journal.issues
  for each row execute function private.edition_date_to_work();

-- ── Check: one call per Edition, and Haven is Edition 0 ─────────────────
do $$
begin
  if exists (select 1 from journal.issues where slug = 'haven' and number <> 0) then
    raise exception 'Haven is Edition 0';
  end if;
end;
$$;
