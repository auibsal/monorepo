-- The Sunday Paper, sent by hand (decisions.md, Qirtas): the Managing Editor
-- puts each issue together in the Diwan with an editor's letter, sends a
-- test to the Editor-in-Chief, and sends it. Nothing goes on its own.

select cron.unschedule('sal-sunday-paper');

create table content.sunday_paper_drafts (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  letter_en text not null default '' check (char_length(letter_en) <= 4000),
  letter_ar text not null default '' check (char_length(letter_ar) <= 4000),
  tested_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index sunday_paper_drafts_updated_by_idx on content.sunday_paper_drafts (updated_by);

comment on table content.sunday_paper_drafts is
  'The Sunday Paper''s issue being put together: the editor''s letter in both languages and when the test went to the Editor-in-Chief. Any change clears the test.';

alter table content.sunday_paper_drafts enable row level security;

create policy "No third-party apps" on content.sunday_paper_drafts
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('content')))
  with check ((select private.client_allows('content')));

create policy "Qirtas's editors read the draft" on content.sunday_paper_drafts
  for select to authenticated
  using ((select private.has_permission('journal.publish')));

grant select on content.sunday_paper_drafts to authenticated;
grant all on content.sunday_paper_drafts to service_role;

-- Saves the letter; a change clears the test, so the issue sent is the one
-- the Editor-in-Chief saw.
create function private.save_sunday_paper(month text, letter_en text, letter_ar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('journal.publish') then
    raise exception 'journal.publish is required' using errcode = '42501';
  end if;
  if exists (select 1 from content.sunday_paper_issues i where i.month = save_sunday_paper.month) then
    raise exception 'already_sent' using errcode = 'P0001';
  end if;
  insert into content.sunday_paper_drafts as d (month, letter_en, letter_ar, updated_by)
  values (save_sunday_paper.month, btrim(coalesce(letter_en, '')), btrim(coalesce(letter_ar, '')), auth.uid())
  on conflict on constraint sunday_paper_drafts_pkey do update set
    letter_en = excluded.letter_en,
    letter_ar = excluded.letter_ar,
    updated_by = excluded.updated_by,
    updated_at = now(),
    tested_at = case
      when d.letter_en = excluded.letter_en and d.letter_ar = excluded.letter_ar then d.tested_at
    end;
end;
$$;

-- The test: both languages to the Editor-in-Chief.
create function private.test_sunday_paper(month text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('journal.publish') then
    raise exception 'journal.publish is required' using errcode = '42501';
  end if;
  if not exists (select 1 from content.sunday_paper_drafts d where d.month = test_sunday_paper.month) then
    raise exception 'no_draft' using errcode = 'P0002';
  end if;
  perform private.enqueue('sunday_paper.test',
    jsonb_build_object('month', test_sunday_paper.month, 'since', now() - interval '1 month'));
  update content.sunday_paper_drafts d set tested_at = now() where d.month = test_sunday_paper.month;
end;
$$;

-- The send: once a month, after the test.
create function private.send_sunday_paper(month text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not private.has_permission('journal.publish') then
    raise exception 'journal.publish is required' using errcode = '42501';
  end if;
  if exists (select 1 from content.sunday_paper_issues i where i.month = send_sunday_paper.month) then
    raise exception 'already_sent' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from content.sunday_paper_drafts d
    where d.month = send_sunday_paper.month and d.tested_at is not null
  ) then
    raise exception 'test_first' using errcode = 'P0001',
      hint = 'Send the test to the Editor-in-Chief first.';
  end if;
  select count(*)::integer into n from private.sunday_paper_recipients();
  if n = 0 then
    raise exception 'no_readers' using errcode = 'P0001';
  end if;
  perform private.enqueue('sunday_paper.broadcast',
    jsonb_build_object('month', send_sunday_paper.month, 'since', now() - interval '1 month'));
  insert into content.sunday_paper_issues (month, sent_on, recipients)
  values (send_sunday_paper.month, (now() at time zone 'Asia/Baghdad')::date, n);
  return n;
end;
$$;

revoke all on function private.save_sunday_paper(text, text, text), private.test_sunday_paper(text),
  private.send_sunday_paper(text) from public, anon;
grant execute on function private.save_sunday_paper(text, text, text), private.test_sunday_paper(text),
  private.send_sunday_paper(text) to authenticated;

create function content.save_sunday_paper(month text, letter_en text, letter_ar text)
returns void language sql security invoker set search_path = ''
as $$ select private.save_sunday_paper(month, letter_en, letter_ar) $$;
create function content.test_sunday_paper(month text)
returns void language sql security invoker set search_path = ''
as $$ select private.test_sunday_paper(month) $$;
create function content.send_sunday_paper(month text)
returns integer language sql security invoker set search_path = ''
as $$ select private.send_sunday_paper(month) $$;

revoke all on function content.save_sunday_paper(text, text, text), content.test_sunday_paper(text),
  content.send_sunday_paper(text) from public, anon;
grant execute on function content.save_sunday_paper(text, text, text), content.test_sunday_paper(text),
  content.send_sunday_paper(text) to authenticated;

-- The automatic path is gone.
drop function if exists private.queue_sunday_paper(date);
