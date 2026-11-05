-- The design review, PR 6 (A27): Second Chapter's catalog, to browse.
--
-- The books given to a campaign for its fair, listed so readers can see
-- what will be there: title, author, language and a short note, never a
-- price (no money is shown anywhere but the collection's signed-off
-- figures). The campaign's managers (charity.manage) keep the catalog on
-- the campaign's Catalog tab in the Diwan; a book shows once listed, on
-- /events/second-chapter/catalog, while its campaign is public.

create table charity.catalog_books (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references charity.campaigns (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  author text check (char_length(author) <= 200),
  language text not null default 'ar' check (language in ('ar', 'en', 'other')),
  note text check (char_length(note) <= 300),
  copies smallint not null default 1 check (copies between 1 and 99),
  is_listed boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table charity.catalog_books is
  'Books given to a Second Chapter campaign, listed to browse before its fair. Never a price.';

create index catalog_books_campaign_idx on charity.catalog_books (campaign_id, title);
create index catalog_books_created_by_idx on charity.catalog_books (created_by);

alter table charity.catalog_books enable row level security;

revoke all on charity.catalog_books from anon, authenticated;
grant select on charity.catalog_books to anon, authenticated;
grant insert (campaign_id, title, author, language, note, copies, is_listed)
  on charity.catalog_books to authenticated;
grant update (title, author, language, note, copies, is_listed)
  on charity.catalog_books to authenticated;
grant delete on charity.catalog_books to authenticated;
grant all on charity.catalog_books to service_role;

create policy "No third-party apps" on charity.catalog_books
  as restrictive for all to authenticated
  using ((select private.client_allows('charity')))
  with check ((select private.client_allows('charity')));

create function private.campaign_is_public(campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from charity.campaigns c
    where c.id = campaign_is_public.campaign_id and c.status <> 'draft'
  );
$$;

revoke all on function private.campaign_is_public(uuid) from public;
grant execute on function private.campaign_is_public(uuid) to anon, authenticated, service_role;

create policy "Anyone reads a public campaign's listed books" on charity.catalog_books
  for select to anon
  using (is_listed and (select private.campaign_is_public(campaign_id)));
create policy "Listed books, and the campaign's own for its managers" on charity.catalog_books
  for select to authenticated
  using (
    (is_listed and (select private.campaign_is_public(campaign_id)))
    or (select private.has_permission('charity.manage', 'campaign', campaign_id))
  );
create policy "Campaign managers add books" on charity.catalog_books
  for insert to authenticated
  with check ((select private.has_permission('charity.manage', 'campaign', campaign_id)));
create policy "Campaign managers change books" on charity.catalog_books
  for update to authenticated
  using ((select private.has_permission('charity.manage', 'campaign', campaign_id)))
  with check ((select private.has_permission('charity.manage', 'campaign', campaign_id)));
create policy "Campaign managers remove books" on charity.catalog_books
  for delete to authenticated
  using ((select private.has_permission('charity.manage', 'campaign', campaign_id)));

create trigger revalidate
  after insert or update or delete on charity.catalog_books
  for each statement execute function private.queue_revalidation('charity');
