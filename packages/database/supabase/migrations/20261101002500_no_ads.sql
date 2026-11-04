-- No money in advertising (owner, Nov 4, 2026; SAL-PLT-06 as amended):
-- Qirtas carries no ads, and sponsors give in kind only, never money. The
-- ads (Society, sponsor and AdSense) are gone from the site and the Diwan,
-- and with them their table, their reader, their image uploads and the
-- memorandum's "Sponsor ads in Qirtas" grant.

drop function if exists journal.current_ads();
drop function if exists private.current_ads();
drop table journal.ads;

-- The memorandum no longer offers advertising.
update governance.partner_agreements
set grants = array_remove(grants, 'advertising'),
    asked_grants = array_remove(asked_grants, 'advertising');

alter table governance.partner_agreements
  drop constraint partner_agreements_grants_check,
  add constraint partner_agreements_grants_check
    check (grants <@ array['journal_submissions', 'guest_editing', 'event_cohosting',
      'member_offer', 'shared_branding', 'productions', 'volunteering']),
  drop constraint partner_agreements_asked_grants_check,
  add constraint partner_agreements_asked_grants_check
    check (asked_grants <@ array['journal_submissions', 'event_cohosting', 'member_offer',
      'shared_branding', 'productions', 'volunteering']);

-- Ad images (media/ads/…) are no longer uploaded: the clause leaves the
-- merged insert policy on storage.objects.
do $$
declare
  p record;
  clause constant text := ' OR ((bucket_id = ''media''::text) AND ((storage.foldername(name))[1] = ''ads''::text) AND ( SELECT private.has_permission(''partners.manage''::text) AS has_permission))';
begin
  for p in
    select policyname, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and position(clause in coalesce(with_check, '')) > 0
  loop
    execute format(
      'alter policy %I on storage.objects with check (%s)',
      p.policyname,
      replace(p.with_check, clause, '')
    );
  end loop;
end;
$$;
