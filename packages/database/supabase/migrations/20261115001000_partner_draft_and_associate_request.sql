-- Two things the account keeps for the person (decisions.md, Partners;
-- Members):
--
-- 1. The partner application's draft is saved on the site as it is
--    filled in, so it follows the person to another device, instead of in
--    one browser. One draft per person, removed when the application is
--    sent (or by the person).
-- 2. An alum's request for Associate membership shows on Today while the
--    Director of Membership answers it. The requests are readable only
--    with members.manage, so the person reads their own through a function,
--    by their sign-in address.

-- ── The partner application's draft ─────────────────────────────────────────

create table governance.partner_application_drafts (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 20000),
  updated_at timestamptz not null default now()
);

comment on table governance.partner_application_drafts is
  'The partner application as its applicant is filling it in, before it is signed and sent. Read and written by that person only.';

create trigger set_updated_at before update on governance.partner_application_drafts
  for each row execute function private.set_updated_at();

alter table governance.partner_application_drafts enable row level security;

revoke all on governance.partner_application_drafts from anon, authenticated;
grant select, insert, delete on governance.partner_application_drafts to authenticated;
grant update (content) on governance.partner_application_drafts to authenticated;
grant all on governance.partner_application_drafts to service_role;

create policy "No third-party apps" on governance.partner_application_drafts
  as restrictive for all to authenticated
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

create policy "Applicants read their draft" on governance.partner_application_drafts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Applicants start their draft" on governance.partner_application_drafts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Applicants keep their draft" on governance.partner_application_drafts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Applicants drop their draft" on governance.partner_application_drafts
  for delete to authenticated using (user_id = (select auth.uid()));

-- ── An alum's request for Associate membership, as they see it ─────────────

create function private.my_associate_request()
returns table (status text, created_at timestamptz, decided_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.status, r.created_at, r.decided_at
  from membership.associate_requests r
  where r.email = lower((select u.email from auth.users u where u.id = (select auth.uid())))
  order by r.created_at desc
  limit 1;
$$;
revoke all on function private.my_associate_request() from public, anon;
grant execute on function private.my_associate_request() to authenticated;

create function membership.my_associate_request()
returns table (status text, created_at timestamptz, decided_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_associate_request() $$;
revoke all on function membership.my_associate_request() from public, anon;
grant execute on function membership.my_associate_request() to authenticated;

comment on function membership.my_associate_request() is
  'The signed-in person''s latest request for Associate membership (pending, approved or declined), for Today.';
