-- Ads in Waraq (owner, Oct 16, 2026: "Add ads to Waraq unless they're a
-- member", with the Society's own and sponsor slots and Google AdSense).
-- auibsal.org shows them on Waraq's pages to visitors who are not signed in;
-- AdSense fills the slots no live ad here takes.
--
-- Rules carried into the database:
--   * A Society ad (an event, an open call, joining SAL) is written by
--     whoever keeps the site's content (content.manage).
--   * A sponsor ad belongs to a partner in the register, is kept by the
--     partnership managers (partners.manage), and runs only while that
--     partner is active with a signed memorandum in force that grants
--     'advertising' (P11.2: nothing unsigned is shown as agreed). The Policy
--     Manual's limits on sponsors (11.3) are checked when the memorandum is
--     signed.
--   * Readers get live ads only through journal.current_ads(): published,
--     within their dates, and (for sponsors) allowed today.

-- ── What a memorandum may grant ────────────────────────────────────────────

alter table governance.partner_agreements
  drop constraint partner_agreements_grants_check;
alter table governance.partner_agreements
  add constraint partner_agreements_grants_check check (grants <@ array[
    'journal_submissions', 'guest_editing', 'event_cohosting', 'member_offer',
    'shared_branding', 'productions', 'volunteering', 'advertising'
  ]);

-- ── Ads ────────────────────────────────────────────────────────────────────

create table journal.ads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('society', 'sponsor')),
  partner_id uuid references governance.partners (id) on delete cascade,
  headline_en text not null default '' check (char_length(headline_en) <= 90),
  headline_ar text not null default '' check (char_length(headline_ar) <= 90),
  body_en text check (char_length(body_en) <= 240),
  body_ar text check (char_length(body_ar) <= 240),
  -- The button: its words and where it goes (an auibsal.org path or https).
  action_en text check (char_length(action_en) <= 40),
  action_ar text check (char_length(action_ar) <= 40),
  url text not null check (url ~ '^(https://|/)' and char_length(url) <= 500),
  -- media/ads/<random>.<ext>
  image_path text check (image_path ~ '^ads/[^/]+$' and char_length(image_path) <= 300),
  image_alt_en text check (char_length(image_alt_en) <= 200),
  image_alt_ar text check (char_length(image_alt_ar) <= 200),
  starts_on date not null default current_date,
  ends_on date,
  is_published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'sponsor') = (partner_id is not null)),
  check (ends_on is null or ends_on >= starts_on),
  check (not is_published or headline_en <> '' or headline_ar <> ''),
  check (image_path is null or image_alt_en is not null or image_alt_ar is not null)
);

comment on table journal.ads is
  'Society and sponsor ads in Waraq, shown on auibsal.org to visitors who are not signed in.';

create index ads_partner_id_idx on journal.ads (partner_id);
create index ads_created_by_idx on journal.ads (created_by);
create index ads_live_idx on journal.ads (starts_on, ends_on) where is_published;

create trigger set_updated_at before update on journal.ads
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on journal.ads
  for each row execute function private.log_activity();
create trigger revalidate after insert or update or delete on journal.ads
  for each statement execute function private.queue_revalidation('journal');

-- Who keeps an ad of this kind.
create function private.can_keep_ad(ad_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case ad_kind
    when 'society' then access.has_permission_anywhere('content.manage')
    when 'sponsor' then access.has_permission('partners.manage')
    else false
  end;
$$;

revoke all on function private.can_keep_ad(text) from public, anon;
grant execute on function private.can_keep_ad(text) to authenticated, service_role;

alter table journal.ads enable row level security;

create policy "Ad keepers read ads"
  on journal.ads for select to authenticated
  using ((select private.can_keep_ad(kind)));
create policy "Ad keepers add ads"
  on journal.ads for insert to authenticated
  with check ((select private.can_keep_ad(kind)));
create policy "Ad keepers change ads"
  on journal.ads for update to authenticated
  using ((select private.can_keep_ad(kind)))
  with check ((select private.can_keep_ad(kind)));
create policy "Ad keepers delete ads"
  on journal.ads for delete to authenticated
  using ((select private.can_keep_ad(kind)));
create policy "Third-party apps reach only their areas"
  on journal.ads as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

grant select on journal.ads to authenticated;
grant insert (kind, partner_id, headline_en, headline_ar, body_en, body_ar, action_en, action_ar,
  url, image_path, image_alt_en, image_alt_ar, starts_on, ends_on, is_published)
  on journal.ads to authenticated;
grant update (kind, partner_id, headline_en, headline_ar, body_en, body_ar, action_en, action_ar,
  url, image_path, image_alt_en, image_alt_ar, starts_on, ends_on, is_published)
  on journal.ads to authenticated;
grant delete on journal.ads to authenticated;
grant all on journal.ads to service_role;

-- The ads running today, for auibsal.org. Public columns only; a sponsor ad
-- carries its partner's name for the "Sponsored by" line.
create function journal.current_ads()
returns table (
  id uuid, kind text, sponsor_en text, sponsor_ar text,
  headline_en text, headline_ar text, body_en text, body_ar text,
  action_en text, action_ar text, url text,
  image_path text, image_alt_en text, image_alt_ar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.kind, p.name_en, p.name_ar,
    a.headline_en, a.headline_ar, a.body_en, a.body_ar,
    a.action_en, a.action_ar, a.url,
    a.image_path, a.image_alt_en, a.image_alt_ar
  from journal.ads a
  left join governance.partners p on p.id = a.partner_id
  where a.is_published
    and a.starts_on <= current_date
    and (a.ends_on is null or a.ends_on >= current_date)
    and (a.kind = 'society' or 'advertising' = any (private.partner_grants(a.partner_id)))
  order by a.starts_on desc, a.created_at desc;
$$;

revoke all on function journal.current_ads() from public;
grant execute on function journal.current_ads() to anon, authenticated, service_role;

-- media/ads/<random>.<ext>: ad images. Content keepers already upload media;
-- partnership managers upload sponsor images here only.
create policy "Partnership managers upload ad images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'ads'
    and (select access.has_permission('partners.manage'))
  );
