-- Drafts in Write for Qirtas (owner, Nov 4, 2026: "let people save drafts
-- in their work"). A member keeps work they haven't sent yet: its section
-- type and what the form holds (title, text, note, pen name, the call it
-- answers). Only its writer reads or changes it; nobody reads it blind or
-- otherwise until it is sent, when it becomes a submission and the draft
-- goes. Files are attached when the work is sent.

create table journal.submission_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category journal.category not null,
  title text not null default '' check (char_length(title) <= 300),
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 500000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_drafts_category_current
    check (journal.is_current_category(category)),
  -- Six Words come only from the Typewriter Tour.
  constraint submission_drafts_not_six_words check (category <> 'six_words')
);

comment on table journal.submission_drafts is
  'Work a member is writing for Qirtas and has not sent. Read and written by its writer only.';

create index submission_drafts_user_idx on journal.submission_drafts (user_id, updated_at desc);

create trigger set_updated_at before update on journal.submission_drafts
  for each row execute function private.set_updated_at();

-- A writer keeps at most fifty drafts.
create function private.drafts_within_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from journal.submission_drafts d where d.user_id = new.user_id) >= 50 then
    raise exception 'too_many_drafts' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.drafts_within_limit() from public, anon, authenticated;

create trigger drafts_within_limit before insert on journal.submission_drafts
  for each row execute function private.drafts_within_limit();

alter table journal.submission_drafts enable row level security;

revoke all on journal.submission_drafts from anon, authenticated;
grant select, insert, delete on journal.submission_drafts to authenticated;
grant update (category, title, content) on journal.submission_drafts to authenticated;
grant all on journal.submission_drafts to service_role;

create policy "No third-party apps" on journal.submission_drafts
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

create policy "Writers read their drafts" on journal.submission_drafts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Writers start drafts" on journal.submission_drafts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Writers keep their drafts" on journal.submission_drafts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Writers drop their drafts" on journal.submission_drafts
  for delete to authenticated using (user_id = (select auth.uid()));
