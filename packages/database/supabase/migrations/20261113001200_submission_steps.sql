-- Writers hear at each step (decisions.md, Qirtas): received, with the
-- record number; in reading; the decision; edits to approve; published.
-- This adds the record number (SUB-<year>-<n>, given on sending) and the
-- "in reading" email; the others were already sent.

alter table core.code_counters drop constraint code_counters_prefix_check;
alter table core.code_counters add constraint code_counters_prefix_check
  check (prefix in ('CERT', 'LTR', 'RES', 'MOU', 'TOUR', 'SUB'));

alter table journal.submissions add column reference text unique;

comment on column journal.submissions.reference is
  'The record number, SUB-<year>-<n>, given when the work is sent; never shown to readers (they read blind copies).';

-- The existing submissions, numbered in the order they came, by their year.
do $$
declare
  s record;
begin
  for s in select id, created_at from journal.submissions order by created_at, id loop
    update journal.submissions
    set reference = private.next_code('SUB',
      extract(year from s.created_at at time zone 'Asia/Baghdad')::integer)
    where id = s.id;
  end loop;
end;
$$;

create function private.number_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.reference := private.next_code('SUB');
  else
    new.reference := old.reference;
  end if;
  return new;
end;
$$;

revoke all on function private.number_submission() from public, anon, authenticated;

create trigger number_submission before insert or update of reference
  on journal.submissions
  for each row execute function private.number_submission();

-- "In reading": the work has passed its first check and readers have it.
create function private.submission_in_reading()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'in_review' and old.status is distinct from 'in_review' then
    perform private.enqueue_once('qirtas.in_reading',
      jsonb_build_object('submission_id', new.id, 'user_id', new.author_id), interval '1 year');
  end if;
  return new;
end;
$$;

revoke all on function private.submission_in_reading() from public, anon, authenticated;

create trigger submission_in_reading after update of status
  on journal.submissions
  for each row execute function private.submission_in_reading();
