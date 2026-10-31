-- Qirtas, one door (owner, Oct 31, 2026). Everything members send goes
-- through the blind review; the newsroom is where staff write and publish
-- directly. The Awards' names are confirmed. Judges and contributors are
-- people chosen from the register; an author may publish under a pen name.

-- ── A standing call ─────────────────────────────────────────────────────────
-- Edition calls stay as they are (an Edition, Letters and Gallery, a closing
-- date). Beside them, one call that never closes and takes every section:
-- it belongs to no Edition, so the masthead that holds its roles across
-- Qirtas (global scope) reads, decides and edits it.

alter table journal.calls alter column issue_id drop not null;
alter table journal.blind_entries alter column issue_id drop not null;

alter table journal.calls drop constraint if exists calls_desks_check;
alter table journal.calls
  add constraint calls_desks_check check (
    cardinality(desks) > 0
    and (issue_id is null or desks <@ '{letters,gallery}'::journal.desk[])
  );

-- At most one standing call.
create unique index calls_one_standing on journal.calls ((true)) where issue_id is null;

insert into journal.calls
  (title_en, title_ar, opens_at, closes_at, desks, is_published, max_per_person)
values (
  'Qirtas, all year', 'قرطاس طوال العام',
  '2026-10-01T00:00:00Z', '2100-01-01T00:00:00Z',
  '{news,voices,letters,gallery,video,games}', true, 6
);

comment on index journal.calls_one_standing is
  'The standing call (no Edition): every section, always open, read blind like any call.';

-- ── Every submission answers a call ─────────────────────────────────────────
-- Work already sent to a section and not yet read moves to the standing
-- call, so it is read blind like the rest; work a section editor has already
-- taken up finishes where it is.
alter table journal.submissions drop constraint submissions_call_for_edition_desks;

update journal.submissions
set call_id = (select id from journal.calls where issue_id is null)
where call_id is null and status in ('received', 'intake_check');

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

  -- One door: an Edition call, or the standing call when none is named.
  if new.call_id is null then
    select id into new.call_id from journal.calls where issue_id is null;
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

  -- An Edition call counts everything sent to it; the standing call counts
  -- this term's.
  since := case when c.issue_id is null
    then coalesce((select t.starts_on::timestamptz from core.current_term() t), now() - interval '120 days')
    else '-infinity'::timestamptz end;
  select count(*) into existing from journal.submissions s
  where s.call_id = new.call_id and s.author_id = new.author_id
    and s.status <> 'withdrawn' and s.created_at >= since;
  if existing >= c.max_per_person then
    raise exception 'You can send at most % submissions to this call', c.max_per_person
      using errcode = '23514';
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

-- ── The Awards' names are confirmed ─────────────────────────────────────────
delete from core.settings where key = 'journal.prize_names_public';

-- ── Judges are people ───────────────────────────────────────────────────────
-- A judge is chosen from the register; the names follow the profile.
alter table journal.prize_judges
  add constraint prize_judges_person check (user_id is not null) not valid;

create function private.judge_names()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.full_name_en, coalesce(p.full_name_ar, p.full_name_en)
    into new.name_en, new.name_ar
  from core.profiles p where p.id = new.user_id;
  if new.name_en is null then
    raise exception 'Judge not found' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
revoke all on function private.judge_names() from public, anon, authenticated;

create trigger judge_names before insert or update of user_id on journal.prize_judges
  for each row execute function private.judge_names();

-- ── Contributors are people ─────────────────────────────────────────────────
-- A byline is a member: under their own name, or under a pen name they
-- chose when sending work (`submissions.pen_name`, made into a pen-name
-- byline by `make_piece`). The desk bylines already published stay.
alter table journal.contributors
  add constraint contributors_person check (user_id is not null) not valid;

-- The newsroom names a byline by choosing a member (and, if they write
-- under one, a pen name). Clients never read `contributors.user_id`, so a
-- pen name can't be traced back to its author; this finds the member's
-- byline, or makes it, and returns only its id.
create function private.byline_for(person uuid, pen_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pen text := nullif(btrim(pen_name), '');
  found_id uuid;
  base_slug text;
  candidate text;
  n integer := 1;
begin
  if not private.can_edit_puzzles() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from core.profiles p where p.id = person) then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
  if pen is not null and char_length(pen) not between 2 and 80 then
    raise exception 'A pen name is 2 to 80 characters' using errcode = '22023';
  end if;

  select c.id into found_id from journal.contributors c
  where c.user_id = person
    and c.is_pen_name = (pen is not null)
    and (pen is null or c.name_en = pen)
  order by c.created_at
  limit 1;
  if found_id is not null then
    return found_id;
  end if;

  base_slug := coalesce(
    nullif(trim(both '-' from regexp_replace(lower(coalesce(pen,
      (select p.full_name_en from core.profiles p where p.id = person))),
      '[^a-z0-9]+', '-', 'g')), ''),
    'contributor'
  );
  candidate := base_slug;
  while exists (select 1 from journal.contributors c where c.slug = candidate) loop
    n := n + 1;
    candidate := base_slug || '-' || n;
  end loop;
  insert into journal.contributors (slug, user_id, name_en, name_ar, is_pen_name)
  values (candidate, person, coalesce(pen, ''), pen, pen is not null)
  returning id into found_id;
  return found_id;
end;
$$;
revoke all on function private.byline_for(uuid, text) from public, anon;
grant execute on function private.byline_for(uuid, text) to authenticated;

create function journal.byline_for(person uuid, pen_name text default null)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.byline_for($1, $2) $$;
revoke all on function journal.byline_for(uuid, text) from public, anon;
grant execute on function journal.byline_for(uuid, text) to authenticated;

-- A member's own byline follows their profile.
create function private.contributor_names()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and not new.is_pen_name then
    select p.full_name_en, p.full_name_ar into new.name_en, new.name_ar
    from core.profiles p where p.id = new.user_id;
    if new.name_en is null then
      raise exception 'Member not found' using errcode = 'P0002';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.contributor_names() from public, anon, authenticated;

create trigger contributor_names before insert or update of user_id, is_pen_name
  on journal.contributors
  for each row execute function private.contributor_names();

create function private.profile_names_to_bylines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update journal.contributors c
  set name_en = new.full_name_en, name_ar = new.full_name_ar
  where c.user_id = new.id and not c.is_pen_name;
  update journal.prize_judges j
  set name_en = new.full_name_en, name_ar = coalesce(new.full_name_ar, new.full_name_en)
  where j.user_id = new.id;
  return null;
end;
$$;
revoke all on function private.profile_names_to_bylines() from public, anon, authenticated;

create trigger names_to_bylines after update of full_name_en, full_name_ar on core.profiles
  for each row
  when (old.full_name_en is distinct from new.full_name_en
    or old.full_name_ar is distinct from new.full_name_ar)
  execute function private.profile_names_to_bylines();

-- "Awards", not "Prizes", everywhere people read it (owner, Oct 31, 2026).
-- The code keeps prize_* names.
update journal.prizes
set name_en = replace(name_en, ' Prize', ' Award');

-- A month in an address is /events/2026-11 and /company/2026-11, so no
-- event or production takes a slug that reads as a month.
alter table events.events
  add constraint events_slug_not_a_month check (slug !~ '^[0-9]{4}-[0-9]{2}$') not valid;
alter table programmes.productions
  add constraint productions_slug_not_a_month check (slug !~ '^[0-9]{4}-[0-9]{2}$') not valid;

-- The retired papers (forms and letters) are templates in the team's Notion
-- workspace; the Desk links to that page beside the handbook.
update core.settings
set value = jsonb_set(
  case when jsonb_typeof(value) = 'object' then value else '{}'::jsonb end,
  '{pages,templates}',
  '"https://app.notion.com/p/3f5882406886818eb022f394586ab400"'
)
where key = 'notion.handbook';
