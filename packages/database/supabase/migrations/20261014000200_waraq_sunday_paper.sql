-- Waraq's rhythm and its Notion link (Notion project "Waraq: one
-- publication for news, letters and art").
--
-- • The Sunday Paper: every Sunday at 9:00 AM Baghdad time, an email of
--   the week's pieces to every member who receives email (core.profiles
--   .notify_email). Nothing is sent in a week without pieces. Emails over
--   the plan's daily limit wait in the outbox for the next day.
-- • Staff news drafted in Notion (Publishing → Content calendar, Kind
--   "Waraq", with a Desk) is imported as a piece in Editing, so it goes
--   through the same approvals: Notion links of kind 'piece'.

create function private.queue_sunday_paper()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - interval '7 days';
  n integer := 0;
  member uuid;
begin
  if not exists (
    select 1 from journal.pieces p
    where p.status = 'published' and p.published_at > since and p.published_at <= now()
  ) then
    return 0;
  end if;
  for member in
    select pr.id from core.profiles pr
    where pr.notify_email and membership.is_member(pr.id)
  loop
    perform private.enqueue('journal.sunday_paper',
      jsonb_build_object('user_id', member, 'since', since));
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function private.queue_sunday_paper() from public, anon, authenticated;

-- 06:00 UTC on Sundays is 9:00 AM in Baghdad.
select cron.schedule('sal-sunday-paper', '0 6 * * 0', $$ select private.queue_sunday_paper() $$);

alter table core.notion_links drop constraint notion_links_kind_check;
alter table core.notion_links add constraint notion_links_kind_check check (
  kind in ('event', 'news', 'officer', 'programme', 'document', 'minutes', 'journal_stage', 'piece')
);
