-- Qirtas as decisions.md has it (decisions.md, Qirtas):
--   1. The Managing Editor handles intake and holds writers' names, and
--      never reads the work while it is read blind.
--   2. Every piece needs two approvals by two people: the section editor,
--      then the Editor-in-Chief or the Managing Editor. Every text piece is
--      copy edited before it runs.
--   3. An editor may set the date a piece carries (on or near its event),
--      and each change is kept: who set it and when.
--   4. The 22 pieces made on Oct 14: the three pre-2026 pieces, Charter Day
--      and the Society's own posts are deleted; the 15 AUIB pieces wait for
--      their staff writers.
--   5. "From the Society" on the front page: the notices already sent.

-- ── 1. Names or text, never both ────────────────────────────────────────────

-- The Managing Editor no longer decides blind work: the section editor
-- does. They keep journal.manage for the calls and the board.
delete from access.role_permissions
where role = 'managing_editor' and permission = 'journal.decide';

-- Whoever holds writers' names is not an issue editor for blind reading.
create or replace function private.is_issue_editor(issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (access.has_permission('journal.decide', 'issue', issue_id)
      or access.has_permission('journal.manage', 'issue', issue_id))
    and not private.can_view_identity(issue_id);
$$;

-- The text of a blind entry: never for whoever holds the names.
create or replace function private.can_read_entry(entry uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from journal.blind_entries b
    where b.id = entry
      and not private.can_view_identity(b.issue_id)
      and (
        (b.flagged and private.has_permission('journal.advise', 'issue', b.issue_id))
        or private.is_assigned_reader(b.id)
        or private.is_issue_editor(b.issue_id)
      )
  );
$$;

-- ── 2. Two approvals on every piece; copy editing on every text piece ──────

create or replace function private.required_approvals(desk journal.desk)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case when desk in ('news', 'voices', 'letters')
    then array['desk', 'chief', 'copy'] else array['desk', 'chief'] end;
$$;

-- Whether anyone holds a permission today (a seat or team role filled).
create function private.anyone_holds(permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from access.role_assignments a
    join access.role_permissions rp on rp.role = a.role
    where rp.permission = anyone_holds.permission
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
  );
$$;

revoke all on function private.anyone_holds(text) from public, anon;
grant execute on function private.anyone_holds(text) to authenticated, service_role;

create or replace function private.approve_piece(piece_id uuid, kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
  other uuid;
begin
  select * into p from journal.pieces where id = approve_piece.piece_id for update;
  if not found then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if private.is_piece_author(p.id) then
    raise exception 'You cannot approve your own piece' using errcode = '42501';
  end if;
  if not (p.status = 'author_approved' or (p.status = 'editing' and p.submission_id is null)) then
    raise exception 'The author approves the text first' using errcode = '22023';
  end if;

  if kind = 'desk' then
    if not access.has_permission('journal.edit.' || p.desk::text, 'issue', p.issue_id) then
      raise exception 'journal.edit.% is required', p.desk using errcode = '42501';
    end if;
    select a.approved_by into other from journal.approvals a where a.piece_id = p.id and a.kind = 'chief';
  elsif kind = 'chief' then
    if not access.has_permission('journal.approve', 'issue', p.issue_id) then
      raise exception 'journal.approve is required' using errcode = '42501';
    end if;
    select a.approved_by into other from journal.approvals a where a.piece_id = p.id and a.kind = 'desk';
  elsif kind = 'copy' then
    -- The Copy Chief or a copy editor; while no one holds the copy desk,
    -- the Editor-in-Chief or the Managing Editor covers it.
    if not (
      access.has_permission('journal.copy', 'issue', p.issue_id)
      or (not private.anyone_holds('journal.copy')
        and access.has_permission('journal.approve', 'issue', p.issue_id))
    ) then
      raise exception 'journal.copy is required' using errcode = '42501';
    end if;
  else
    raise exception 'Unknown approval' using errcode = '22023';
  end if;
  if other = auth.uid() then
    raise exception 'The desk and the chief approvals come from two people' using errcode = '22023';
  end if;

  insert into journal.approvals (piece_id, kind) values (p.id, approve_piece.kind)
  on conflict on constraint approvals_pkey do nothing;
  return private.try_publish(p.id);
end;
$$;

-- ── 3. The date a piece carries ─────────────────────────────────────────────

alter table journal.pieces add column dated_at timestamptz;

comment on column journal.pieces.dated_at is
  'The date the piece carries when an editor sets it (on or near its event, decisions.md, Qirtas); published_at takes it on publishing. Each change is kept in journal.piece_dates.';

create table journal.piece_dates (
  id bigint generated always as identity primary key,
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  dated_at timestamptz,
  set_by uuid references auth.users (id) on delete set null default auth.uid(),
  set_at timestamptz not null default now()
);

create index piece_dates_piece_id_idx on journal.piece_dates (piece_id, set_at);
create index piece_dates_set_by_idx on journal.piece_dates (set_by);

comment on table journal.piece_dates is
  'Each date an editor set on a piece: the date, who set it and when. Written only by journal.date_piece().';

alter table journal.piece_dates enable row level security;

create policy "No third-party apps" on journal.piece_dates
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

create policy "The piece's editors read its dates" on journal.piece_dates
  for select to authenticated
  using (
    exists (
      select 1 from journal.pieces p
      where p.id = piece_dates.piece_id
        and (select private.can_edit_piece(p.desk, p.issue_id))
    )
  );

revoke all on journal.piece_dates from anon, authenticated;
grant select on journal.piece_dates to authenticated;
grant all on journal.piece_dates to service_role;

-- Sets (or clears, with null) the date a piece carries. A date in the past
-- or today only: a later date is a schedule (schedule_piece). A piece
-- already out takes the new date at once.
create function private.date_piece(piece_id uuid, dated_at timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
begin
  select * into p from journal.pieces where id = date_piece.piece_id for update;
  if not found or not (
    access.has_permission('journal.approve', 'issue', p.issue_id)
    or access.has_permission('journal.edit.' || p.desk::text, 'issue', p.issue_id)
  ) then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if date_piece.dated_at is not null and date_piece.dated_at > now() then
    raise exception 'A later date is a schedule' using errcode = '22023';
  end if;
  update journal.pieces set dated_at = date_piece.dated_at where id = p.id;
  if p.status = 'published' then
    update journal.pieces
    set published_at = coalesce(date_piece.dated_at, p.publish_at, p.published_at)
    where id = p.id;
  end if;
  insert into journal.piece_dates (piece_id, dated_at) values (p.id, date_piece.dated_at);
  return date_piece.dated_at;
end;
$$;

create function journal.date_piece(piece_id uuid, dated_at timestamptz)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.date_piece(piece_id, dated_at);
$$;

comment on function journal.date_piece(uuid, timestamptz) is
  'Sets the date a piece carries (today or earlier; null clears it), for the section editor, the Editor-in-Chief or the Managing Editor; each change is kept.';

revoke all on function private.date_piece(uuid, timestamptz) from public, anon;
revoke all on function journal.date_piece(uuid, timestamptz) from public, anon;
grant execute on function private.date_piece(uuid, timestamptz) to authenticated, service_role;
grant execute on function journal.date_piece(uuid, timestamptz) to authenticated;

-- Publishing gives the piece its set date, when it has one.
create or replace function private.try_publish(piece_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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
  due := coalesce(p.publish_at, launch, now());
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
$$;

-- ── 4. The 22 pieces made on Oct 14 ─────────────────────────────────────────

-- Deleted: the three pre-2026 pieces, Charter Day and the Society's own
-- posts, which two "From the Society" notices dated Nov 8 replace ("auibsal.org
-- is open" and "The Society's documents are online"), published by Media.
-- Never anything already out.
delete from journal.pieces
where status <> 'published'
  and slug in (
    'iraq-energy-institute-opens-offices-at-auib',
    'auib-graduates-its-first-class',
    'auib-and-somo-discuss-energy-forum',
    'society-ratifies-its-constitution-on-charter-day',
    'qirtas-launches-as-one-paper',
    'society-publishes-its-founding-documents',
    'society-publishes-its-member-handbook'
  );

-- The 15 that stay keep their event dates as the dates they will carry.
update journal.pieces
set dated_at = published_at
where status = 'unpublished'
  and created_at::date = date '2026-10-14'
  and desk = 'news'
  and dated_at is null;

-- ── 5. "From the Society" on the front page ─────────────────────────────────

-- The notices the President has sent, newest first, for anyone.
create function private.society_notices(max_results integer default 5)
returns table (
  id uuid,
  title_en text,
  title_ar text,
  body_en text,
  body_ar text,
  link_path text,
  sent_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.title_en, a.title_ar, a.body_en, a.body_ar, a.link_path, a.sent_at
  from core.announcements a
  where a.sent_at is not null
  order by a.sent_at desc
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
  sent_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.society_notices(max_results);
$$;

comment on function core.society_notices(integer) is
  'The Society''s sent notices, newest first: Qirtas''s "From the Society" stream (decisions.md, Qirtas).';

revoke all on function private.society_notices(integer) from public;
revoke all on function core.society_notices(integer) from public;
grant execute on function private.society_notices(integer) to anon, authenticated, service_role;
grant execute on function core.society_notices(integer) to anon, authenticated, service_role;
