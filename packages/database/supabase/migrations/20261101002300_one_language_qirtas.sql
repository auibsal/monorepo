-- One language per piece in Notion's Content calendar too (owner, Nov 4,
-- 2026): Title (Arabic) and Excerpt (Arabic) are gone; an Arabic edition is
-- its own row (Language Arabic, Edition of the English row) and is linked to
-- the piece its English row made (apps/web/lib/api/notion/publish.ts).

alter table core.notion_links drop constraint notion_links_kind_check;
alter table core.notion_links add constraint notion_links_kind_check
  check (kind in (
    'event', 'event_ar', 'news', 'officer', 'programme', 'programme_ar',
    'document', 'minutes', 'journal_stage', 'piece', 'piece_ar'
  ));
