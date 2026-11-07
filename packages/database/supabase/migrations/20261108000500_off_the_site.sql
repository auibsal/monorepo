-- Taking things off the site from Notion (audit A3), and nothing published
-- without a confirmed place (decisions §7, §10).

-- A document stays on record (its adoption is the site's) but can come off
-- the Library when its Notion row is set back or trashed.
alter table governance.society_documents
  add column on_site boolean not null default true;

comment on column governance.society_documents.on_site is
  'Shown in the Library. The Notion sync clears it when the document''s row is set back from Published or trashed (audit A3).';

drop policy "Everyone reads the public documents" on governance.society_documents;
create policy "Everyone reads the public documents" on governance.society_documents
  as permissive for select to anon
  using (audience = 'public' and on_site);

drop policy "Select by authenticated" on governance.society_documents;
create policy "Select by authenticated" on governance.society_documents
  as permissive for select to authenticated
  using (
    (audience = 'public' and on_site)
    or (select private.has_permission('governance.manage'))
    or (
      audience = 'internal'
      and (select private.has_permission_anywhere('library.read'))
    )
  );

-- An event is published only with a lead and a confirmed place (decisions
-- §10); no room is confirmed yet for any date (§7: "no event is published
-- before its room is confirmed"; §11: every date stays in Planning until
-- then; the Nov 17 workshop is canceled). Every published event without a
-- place comes off the site; their Notion rows go back to Planning.
update events.events
set status = 'draft'
where status = 'published' and (venue_en is null or btrim(venue_en) = '');

update events.events
set status = 'cancelled'
where slug = 'writing-workshop-2026-11-17';
