-- Revise and resend (decisions.md, Qirtas; the owner's fourth prompt, 7i):
-- the section editor may ask once for a revision. The work goes back to the
-- writer with the editor's note, keeps its SUB number, and, once the writer
-- sends it back, returns to that editor in selection: it is not read blind
-- again. The writer hears by email; the editor hears when it comes back.
--
-- The request is not a decision (journal.decisions keeps the final one);
-- it is kept on the submission and in its status history.

alter table journal.submissions
  add column revision_requested_at timestamptz,
  add column revision_editor uuid references auth.users (id) on delete set null,
  add column revised_at timestamptz,
  add constraint submissions_revision_order
    check (revised_at is null or revision_requested_at is not null);

create index submissions_revision_editor_idx on journal.submissions (revision_editor);

-- The blind board shows the request too (editors read blind entries, not
-- submissions).
alter table journal.blind_entries
  add column revision_requested_at timestamptz;

grant select (revision_requested_at) on journal.blind_entries to authenticated;

-- Selection may go back to the writer, and the revision comes back to
-- selection; nothing else changes.
create or replace function private.allowed_transition(
  from_status journal.submission_status,
  to_status journal.submission_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (from_status, to_status) in (
    ('received'::journal.submission_status, 'intake_check'::journal.submission_status),
    ('intake_check', 'in_review'),
    ('in_review', 'third_read'),
    ('in_review', 'selection'),
    ('third_read', 'selection'),
    ('selection', 'accepted'),
    ('selection', 'declined'),
    ('selection', 'in_review'),
    ('selection', 'intake_check'),
    ('intake_check', 'selection'),
    ('received', 'withdrawn'),
    ('intake_check', 'withdrawn'),
    ('in_review', 'withdrawn'),
    ('third_read', 'withdrawn'),
    ('selection', 'withdrawn')
  );
$$;

-- Revised work skips the readers, and only revised work skips them.
create function private.revision_path()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'intake_check' and new.status = 'in_review'
    and old.revision_requested_at is not null then
    raise exception 'Revised work goes back to its editor, not to the readers'
      using errcode = '22023';
  end if;
  if old.status = 'intake_check' and new.status = 'selection'
    and (new.revision_requested_at is null or new.revised_at is null) then
    raise exception 'Only a revision comes back to selection' using errcode = '22023';
  end if;
  if old.status = 'selection' and new.status = 'intake_check'
    and new.revision_requested_at is null then
    raise exception 'Ask for a revision to send work back' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger revision_path
  before update of status on journal.submissions
  for each row execute function private.revision_path();

-- The request: once, by the section editor, with the note the writer reads.
create function private.request_revision(
  blind_entry_id uuid,
  submission_id uuid,
  note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s journal.submissions;
  entry journal.blind_entries;
begin
  if nullif(btrim(coalesce(note, '')), '') is null then
    raise exception 'A decision needs its reason' using errcode = '22023';
  end if;
  if request_revision.blind_entry_id is not null then
    select * into entry from journal.blind_entries b
    where b.id = request_revision.blind_entry_id for update;
    if not found or not access.has_permission(
      'journal.edit.' || entry.desk::text, 'issue', entry.issue_id
    ) then
      raise exception 'The section editor asks for a revision' using errcode = '42501';
    end if;
    select sub.* into s from journal.submissions sub
    join journal.blind_keys k on k.submission_id = sub.id
    where k.blind_entry_id = entry.id
    for update of sub;
  else
    select * into s from journal.submissions sub
    where sub.id = request_revision.submission_id for update;
    if not found or s.call_id is not null or not private.is_desk_editor(s.desk) then
      raise exception 'Submission not found' using errcode = 'P0002';
    end if;
  end if;
  if s.status not in ('in_review', 'selection') then
    raise exception 'Only work in selection can go back for a revision' using errcode = '22023';
  end if;
  if s.revision_requested_at is not null then
    raise exception 'A revision is asked for once' using errcode = '22023';
  end if;

  update journal.submissions
  set revision_requested_at = now(), revision_editor = auth.uid()
  where id = s.id;
  update journal.blind_entries b set revision_requested_at = now()
  from journal.blind_keys k
  where k.blind_entry_id = b.id and k.submission_id = s.id;

  if s.status = 'in_review' then
    perform private.set_submission_status(s.id, 'selection', null);
  end if;
  perform private.set_submission_status(s.id, 'intake_check', 'Revise and resend');
  -- The writer edits it on their page, as when it is returned for
  -- formatting; the note is what they read there and in the email.
  update journal.submissions
  set intake_returned_at = now(), intake_note = btrim(note)
  where id = s.id;

  perform private.enqueue('qirtas.decision',
    jsonb_build_object(
      'submission_id', s.id,
      'user_id', s.author_id,
      'decision', 'revise'
    ));
  return s.id;
end;
$$;

revoke all on function private.request_revision(uuid, uuid, text) from public, anon;
grant execute on function private.request_revision(uuid, uuid, text) to authenticated;

-- A decision of "revise" is the request (blind and named alike).
do $$
declare
  fn text;
  def text;
  branch text;
begin
  foreach fn in array array['private.decide', 'private.decide_named'] loop
    def := pg_get_functiondef(fn::regproc);
    branch := case fn
      when 'private.decide' then
        E'begin\n  if decide.decision = ''revise'' then\n    perform private.request_revision(decide.blind_entry_id, null, decide.notes);\n    return null;\n  end if;\n'
      else
        E'begin\n  if decide_named.decision = ''revise'' then\n    perform private.request_revision(null, decide_named.submission_id, decide_named.notes);\n    return null;\n  end if;\n'
    end;
    if position(E'\nbegin\n' in def) = 0 then
      raise exception 'Unexpected body in %', fn;
    end if;
    def := overlay(def placing E'\n' || branch
      from position(E'\nbegin\n' in def) for length(E'\nbegin\n'));
    execute def;
  end loop;
end
$$;

-- The writer sends the revision back: to selection, the same SUB number,
-- the blind copy refreshed for the editor.
create function private.resend_revision(submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s journal.submissions;
begin
  select * into s from journal.submissions sub
  where sub.id = resend_revision.submission_id for update;
  if not found or s.author_id is distinct from auth.uid() then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if s.status <> 'intake_check' or s.revision_requested_at is null or s.revised_at is not null then
    raise exception 'Nothing is waiting for a revision' using errcode = '22023';
  end if;

  update journal.submissions set revised_at = now() where id = s.id;
  update journal.blind_entries b
  set title = s.title, body_html = s.body_html, source_text = s.source_text
  from journal.blind_keys k
  where k.blind_entry_id = b.id and k.submission_id = s.id;
  perform private.set_submission_status(s.id, 'selection', 'Revision sent');

  if s.revision_editor is not null then
    perform private.enqueue('qirtas.revision_resent',
      jsonb_build_object('submission_id', s.id, 'user_id', s.revision_editor));
  end if;
end;
$$;

revoke all on function private.resend_revision(uuid) from public, anon;
grant execute on function private.resend_revision(uuid) to authenticated;

create function journal.resend_revision(submission_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.resend_revision($1) $$;

revoke all on function journal.resend_revision(uuid) from public, anon;
grant execute on function journal.resend_revision(uuid) to authenticated, service_role;

-- The named queue shows the request.
drop function journal.desk_queue();
drop function private.desk_queue();

create function private.desk_queue()
returns table (
  submission_id uuid,
  desk journal.desk,
  category journal.category,
  language journal.language,
  title text,
  deck text,
  status journal.submission_status,
  author_id uuid,
  author_name_en text,
  author_name_ar text,
  pen_name text,
  file_count integer,
  intake_note text,
  intake_returned_at timestamptz,
  piece_id uuid,
  created_at timestamptz,
  revision_requested_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.desk, s.category, s.language, s.title, s.deck, s.status, s.author_id,
    p.full_name_en, p.full_name_ar, s.pen_name,
    (select count(*)::integer from journal.submission_files f where f.submission_id = s.id),
    s.intake_note, s.intake_returned_at,
    (select pc.id from journal.pieces pc where pc.submission_id = s.id),
    s.created_at, s.revision_requested_at
  from journal.submissions s
  left join core.profiles p on p.id = s.author_id
  where s.call_id is null and private.is_desk_editor(s.desk)
  order by s.created_at desc;
$$;

revoke all on function private.desk_queue() from public, anon;
grant execute on function private.desk_queue() to authenticated, service_role;

create function journal.desk_queue()
returns table (
  submission_id uuid,
  desk journal.desk,
  category journal.category,
  language journal.language,
  title text,
  deck text,
  status journal.submission_status,
  author_id uuid,
  author_name_en text,
  author_name_ar text,
  pen_name text,
  file_count integer,
  intake_note text,
  intake_returned_at timestamptz,
  piece_id uuid,
  created_at timestamptz,
  revision_requested_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.desk_queue() $$;

revoke all on function journal.desk_queue() from public, anon;
grant execute on function journal.desk_queue() to authenticated, service_role;
