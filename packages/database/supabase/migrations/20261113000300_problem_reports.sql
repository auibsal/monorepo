-- "Report a problem" on every page, reaching the web lead in the Diwan
-- (decisions.md, The site). Written by the API route after its checks
-- (anyone may report; a signed-in person's account is attached); read and
-- closed by whoever holds settings.manage (the web lead; the President).

create table core.problem_reports (
  id uuid primary key default gen_random_uuid(),
  page text not null check (char_length(page) between 1 and 500),
  message text not null check (char_length(message) between 5 and 2000),
  user_id uuid references auth.users (id) on delete set null,
  -- For a reply when the person isn't signed in; optional.
  reply_to text check (reply_to is null or reply_to ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  lang text not null default 'en' check (lang in ('en', 'ar')),
  status text not null default 'open' check (status in ('open', 'fixed', 'closed')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index problem_reports_open_idx on core.problem_reports (created_at) where status = 'open';
create index problem_reports_user_idx on core.problem_reports (user_id);
create index problem_reports_handled_by_idx on core.problem_reports (handled_by);

alter table core.problem_reports enable row level security;

create policy "No third-party apps" on core.problem_reports
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

create policy "The web lead reads problem reports" on core.problem_reports
  for select to authenticated
  using ((select private.has_permission('settings.manage')));

create policy "The web lead closes problem reports" on core.problem_reports
  for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

grant select, update (status, handled_by, handled_at) on core.problem_reports to authenticated;
grant all on core.problem_reports to service_role;

comment on table core.problem_reports is
  'Problems people report from any page (decisions.md, The site), for the web lead; a reply address only when the person isn''t signed in. Kept a year.';

select cron.schedule('sal-problem-reports', '50 4 * * *',
  $$ delete from core.problem_reports where created_at < now() - interval '1 year' $$);
