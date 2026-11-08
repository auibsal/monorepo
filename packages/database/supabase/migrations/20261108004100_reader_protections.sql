-- Readers read the work, never the file (owner, Nov 8, 2026).
--
-- • A reader reads a blind entry's text in the page, and a Gallery image as
--   a copy marked with their card number and the day; no file, download or
--   file address reaches them (/api/files/blind returns marked images only).
-- • The text comes through journal.entry_text(), only to someone who may
--   read the entry and has taken the readers' pledge (confidentiality, no
--   copies, no sharing, stepping aside from work they know). The columns
--   are no longer selectable by themselves.
-- • Originals open only for their author, the Submissions Manager while the
--   work is in intake, and the section's editor or the Editor-in-Chief once
--   it is accepted (or, for named work at a section's desk, its editor).
--   Every opening by anyone but the author is kept (journal.original_openings)
--   and shown in the submission's History.

-- ── The readers' pledge ─────────────────────────────────────────────────────

create table journal.reader_pledges (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version smallint not null check (version > 0),
  agreed_at timestamptz not null default now()
);

comment on table journal.reader_pledges is
  'Who has taken the readers'' pledge, and which version. Written only by journal.take_reader_pledge().';

alter table journal.reader_pledges enable row level security;

create policy "No third-party apps" on journal.reader_pledges
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

create policy "Readers read their own pledge" on journal.reader_pledges
  as permissive for select to authenticated
  using (user_id = (select auth.uid()));

grant select on journal.reader_pledges to authenticated;
grant all on journal.reader_pledges to service_role;

-- The pledge's current version: a new text asks everyone again.
create function private.reader_pledge_version()
returns smallint
language sql
immutable
set search_path = ''
as $$
  select 1::smallint
$$;

create function private.has_reader_pledge()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from journal.reader_pledges p
    where p.user_id = (select auth.uid())
      and p.version = private.reader_pledge_version()
  );
$$;

create function private.take_reader_pledge()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  agreed timestamptz;
begin
  if me is null then
    raise exception 'Sign in to take the pledge' using errcode = '28000';
  end if;
  insert into journal.reader_pledges (user_id, version)
  values (me, private.reader_pledge_version())
  on conflict (user_id) do update
    set version = excluded.version, agreed_at = now()
    where journal.reader_pledges.version <> excluded.version
  returning agreed_at into agreed;
  return coalesce(
    agreed,
    (select p.agreed_at from journal.reader_pledges p where p.user_id = me)
  );
end;
$$;

create function journal.take_reader_pledge()
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.take_reader_pledge();
$$;

create function journal.my_reader_pledge()
returns table (version smallint, agreed_at timestamptz, current boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.version, p.agreed_at, p.version = private.reader_pledge_version()
  from journal.reader_pledges p
  where p.user_id = (select auth.uid());
$$;

revoke all on function private.reader_pledge_version() from public, anon;
revoke all on function private.has_reader_pledge() from public, anon;
revoke all on function private.take_reader_pledge() from public, anon;
revoke all on function journal.take_reader_pledge() from public, anon;
revoke all on function journal.my_reader_pledge() from public, anon;
grant execute on function private.reader_pledge_version() to authenticated, service_role;
grant execute on function private.has_reader_pledge() to authenticated, service_role;
grant execute on function private.take_reader_pledge() to authenticated, service_role;
grant execute on function journal.take_reader_pledge() to authenticated;
grant execute on function journal.my_reader_pledge() to authenticated;

-- ── The text, only after the pledge ─────────────────────────────────────────

revoke select on journal.blind_entries from authenticated;
grant select (
  id, blind_id, call_id, issue_id, category, language, title, status,
  editor_notes, flagged, flag_note, created_at, updated_at, desk
) on journal.blind_entries to authenticated;

-- Whether the caller may read this entry (the entries' read policy).
create function private.can_read_entry(entry uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from journal.blind_entries b
    where b.id = entry
      and (
        (b.flagged and private.has_permission('journal.advise', 'issue', b.issue_id))
        or private.is_assigned_reader(b.id)
        or private.is_issue_editor(b.issue_id)
        or private.can_view_identity(b.issue_id)
      )
  );
$$;

create function private.entry_text(entry uuid)
returns table (body_html text, source_text text, mark text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_read_entry(entry) then
    return;
  end if;
  if not private.has_reader_pledge() then
    raise exception 'Take the readers'' pledge first'
      using errcode = 'P0001', hint = 'reader_pledge';
  end if;
  return query
    select b.body_html, b.source_text,
      coalesce('No. ' || lpad(c.number::text, 5, '0'), '')
    from journal.blind_entries b
    left join membership.cards c on c.user_id = (select auth.uid())
    where b.id = entry;
end;
$$;

create function journal.entry_text(entry uuid)
returns table (body_html text, source_text text, mark text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.entry_text(entry);
$$;

comment on function journal.entry_text(uuid) is
  'A blind entry''s text for someone who may read it and has taken the readers'' pledge, with the mark (their card number) the page sets over it.';

revoke all on function private.can_read_entry(uuid) from public, anon;
revoke all on function private.entry_text(uuid) from public, anon;
revoke all on function journal.entry_text(uuid) from public, anon;
grant execute on function private.can_read_entry(uuid) to authenticated, service_role;
grant execute on function private.entry_text(uuid) to authenticated, service_role;
grant execute on function journal.entry_text(uuid) to authenticated;

-- ── Originals, by role, and every opening kept ──────────────────────────────

create table journal.original_openings (
  id bigint generated always as identity primary key,
  file_id uuid not null references journal.submission_files (id) on delete cascade,
  submission_id uuid not null references journal.submissions (id) on delete cascade,
  opened_by uuid references auth.users (id) on delete set null,
  opened_at timestamptz not null default now()
);

create index original_openings_file_id_idx on journal.original_openings (file_id);
create index original_openings_submission_id_idx on journal.original_openings (submission_id, opened_at);
create index original_openings_opened_by_idx on journal.original_openings (opened_by);

comment on table journal.original_openings is
  'Each time someone other than its author opened an original file. Written only by journal.open_original(); deleted with the submission.';

alter table journal.original_openings enable row level security;

create policy "No third-party apps" on journal.original_openings
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

create policy "The submission's handlers read its openings" on journal.original_openings
  as permissive for select to authenticated
  using (
    exists (
      select 1 from journal.submissions s
      where s.id = original_openings.submission_id
        and (
          (select private.can_view_identity(private.call_issue(s.call_id)))
          or (select private.is_desk_editor(coalesce(s.desk, journal.desk_of(s.category)), private.call_issue(s.call_id)))
        )
    )
  );

grant select on journal.original_openings to authenticated;
grant all on journal.original_openings to service_role;

create function private.open_original(file uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  f journal.submission_files;
  s journal.submissions;
  issue uuid;
begin
  select * into f from journal.submission_files where id = file;
  if not found then
    raise exception 'No such file' using errcode = 'P0002';
  end if;
  select * into s from journal.submissions where id = f.submission_id;
  if s.author_id = me then
    return f.storage_path;
  end if;
  issue := private.call_issue(s.call_id);
  if not (
    (s.status in ('received', 'intake_check') and private.can_view_identity(issue))
    or (s.status = 'accepted' and private.is_desk_editor(coalesce(s.desk, journal.desk_of(s.category)), issue))
    or (s.call_id is null and private.is_desk_editor(coalesce(s.desk, journal.desk_of(s.category)), issue))
  ) then
    raise exception 'The original is not open to you now'
      using errcode = '42501';
  end if;
  insert into journal.original_openings (file_id, submission_id, opened_by)
  values (f.id, s.id, me);
  return f.storage_path;
end;
$$;

create function journal.open_original(file uuid)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.open_original(file);
$$;

comment on function journal.open_original(uuid) is
  'An original file''s storage path for its author, the Submissions Manager in intake, or the section''s editor or the Editor-in-Chief once accepted; each opening is kept.';

revoke all on function private.open_original(uuid) from public, anon;
revoke all on function journal.open_original(uuid) from public, anon;
grant execute on function private.open_original(uuid) to authenticated, service_role;
grant execute on function journal.open_original(uuid) to authenticated;
