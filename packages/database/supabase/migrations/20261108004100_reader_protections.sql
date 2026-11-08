-- Readers read the work, never the file (owner, Nov 8, 2026).
--
-- • A reader reads a blind entry's text in the page, and a Gallery image as
--   a copy marked with their card number and the day; no file, download or
--   file address reaches them (/api/files/blind returns marked images only).
-- • The text comes through journal.entry_text(), only to someone who may
--   read the entry and has signed F-40, the Confidentiality pledge
--   (decisions.md: everyone signs F-40 before reading). The columns are no
--   longer selectable by themselves.
-- • Originals open only for their author, the Submissions Manager while the
--   work is in intake, and the section's editor or the Editor-in-Chief once
--   it is accepted (or, for named work at a section's desk, its editor).
--   Every opening by anyone but the author is kept (journal.original_openings)
--   and shown in the submission's History.

-- ── The readers' pledge is F-40 ─────────────────────────────────────────────
-- F-40, the Confidentiality pledge, is signed on the reading page itself
-- (the register's "part of another page"): the reader's name on the
-- platform is the signature, they agree to sign electronically, and the
-- signed copy is kept and emailed like every form's. Nothing is left for a
-- handler to do, so it is kept closed. A new version of F-40 asks again.

create function private.has_reader_pledge()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.form_submissions s
    join governance.form_types t on t.key = s.form_key
    where s.form_key = 'f40'
      and s.submitted_by = (select auth.uid())
      and s.form_version = t.version
      and s.signed_at is not null
  );
$$;

create function private.sign_reader_pledge(esign_agreed boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  t governance.form_types;
  signer text;
  ip text;
  new_id uuid;
  signed timestamptz;
begin
  if me is null or not private.is_staff(me) then
    raise exception 'Only the review team signs the readers'' pledge'
      using errcode = '42501';
  end if;
  if not coalesce(esign_agreed, false) then
    raise exception 'esign_agreement_required' using errcode = '23514';
  end if;
  select * into t from governance.form_types where key = 'f40';
  select s.signed_at into signed
  from governance.form_submissions s
  where s.form_key = 'f40' and s.submitted_by = me and s.form_version = t.version
  order by s.signed_at desc
  limit 1;
  if signed is not null then
    return signed;
  end if;
  -- The signature is the name on the platform, never typed.
  select coalesce(nullif(btrim(p.full_name_en), ''), btrim(p.full_name_ar)) into signer
  from core.profiles p where p.id = me;
  if char_length(coalesce(signer, '')) < 2 then
    raise exception 'signature_required' using errcode = '23514';
  end if;
  ip := split_part(coalesce(
    (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1);
  insert into governance.form_submissions (
    form_key, submitted_by, routing, data, status, submitted_at, form_version,
    signer_name, signed_at, esign_agreed, signer_ip, document_sha256
  ) values (
    'f40', me, 'none', '{}'::jsonb, 'closed', now(), t.version,
    signer, now(), true, nullif(btrim(ip), ''),
    encode(extensions.digest(jsonb_build_object(
      'form', t.code, 'version', t.version, 'data', '{}'::jsonb, 'signer', signer
    )::text, 'sha256'), 'hex')
  )
  returning id, signed_at into new_id, signed;
  perform private.enqueue('forms.signed_copy', jsonb_build_object('submission_id', new_id));
  return signed;
end;
$$;

create function journal.sign_reader_pledge(esign_agreed boolean)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.sign_reader_pledge(esign_agreed);
$$;

-- The caller's own F-40, read under RLS (a submitter reads their own).
create function journal.my_reader_pledge()
returns table (version integer, agreed_at timestamptz, current boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.form_version, s.signed_at, s.form_version = t.version
  from governance.form_submissions s
  join governance.form_types t on t.key = s.form_key
  where s.form_key = 'f40' and s.submitted_by = (select auth.uid())
  order by s.signed_at desc
  limit 1;
$$;

revoke all on function private.has_reader_pledge() from public, anon;
revoke all on function private.sign_reader_pledge(boolean) from public, anon;
revoke all on function journal.sign_reader_pledge(boolean) from public, anon;
revoke all on function journal.my_reader_pledge() from public, anon;
grant execute on function private.has_reader_pledge() to authenticated, service_role;
grant execute on function private.sign_reader_pledge(boolean) to authenticated, service_role;
grant execute on function journal.sign_reader_pledge(boolean) to authenticated;
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
    raise exception 'Sign the readers'' pledge (F-40) first'
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
