-- The newsroom's standards (decisions.md, Qirtas): every News fact checked
-- against a second source or document before the second approval, with the
-- checker noted; writers disclose ties to what they cover, and editors
-- reassign or note it.

alter table journal.pieces
  add column checked_by uuid references auth.users (id) on delete set null,
  add column checked_at timestamptz,
  add column conflict_disclosure text check (char_length(conflict_disclosure) <= 2000);

create index pieces_checked_by_idx on journal.pieces (checked_by);

comment on column journal.pieces.checked_by is
  'Who checked every fact of a News piece against a second source or document (before the second approval).';
comment on column journal.pieces.conflict_disclosure is
  'The writer''s ties to what the piece covers, in their words; editors reassign or note it.';

-- Recording the second-source check: a News desk editor or the chief, never
-- the piece's own writer.
create function private.record_fact_check(piece_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
begin
  select * into p from journal.pieces where id = record_fact_check.piece_id for update;
  if not found or p.desk <> 'news' then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if private.is_piece_author(p.id) then
    raise exception 'You cannot check your own piece' using errcode = '42501';
  end if;
  if not (
    access.has_permission('journal.edit.news', 'issue', p.issue_id)
    or access.has_permission('journal.approve', 'issue', p.issue_id)
  ) then
    raise exception 'journal.edit.news is required' using errcode = '42501';
  end if;
  update journal.pieces set checked_by = auth.uid(), checked_at = now()
  where id = p.id;
  return now();
end;
$$;

revoke all on function private.record_fact_check(uuid) from public, anon;
grant execute on function private.record_fact_check(uuid) to authenticated, service_role;

create function journal.record_fact_check(piece_id uuid)
returns timestamptz
language sql
set search_path = ''
as $$ select private.record_fact_check(piece_id) $$;

revoke all on function journal.record_fact_check(uuid) from public, anon;
grant execute on function journal.record_fact_check(uuid) to authenticated, service_role;

-- The writer's disclosure, on their piece, until it is published.
create function private.set_conflict_disclosure(piece_id uuid, disclosure text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_piece_author(set_conflict_disclosure.piece_id) then
    raise exception 'Only the writer discloses' using errcode = '42501';
  end if;
  update journal.pieces
  set conflict_disclosure = nullif(btrim(coalesce(set_conflict_disclosure.disclosure, '')), '')
  where id = set_conflict_disclosure.piece_id and status not in ('published', 'unpublished');
end;
$$;

revoke all on function private.set_conflict_disclosure(uuid, text) from public, anon;
grant execute on function private.set_conflict_disclosure(uuid, text) to authenticated, service_role;

create function journal.set_conflict_disclosure(piece_id uuid, disclosure text)
returns void
language sql
set search_path = ''
as $$ select private.set_conflict_disclosure(piece_id, disclosure) $$;

revoke all on function journal.set_conflict_disclosure(uuid, text) from public, anon;
grant execute on function journal.set_conflict_disclosure(uuid, text) to authenticated, service_role;

-- The second approval waits for the check on News.
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
    -- News: every fact checked against a second source or document before
    -- the second approval, with the checker noted (decisions.md, Qirtas).
    if p.desk = 'news' and p.checked_at is null then
      raise exception 'fact_check_required' using errcode = '22023';
    end if;
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
