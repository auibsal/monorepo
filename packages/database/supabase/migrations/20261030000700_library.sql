-- The Library (owner, Oct 30, 2026): the Society's documents are the public
-- Library at auibsal.org/library, kept in the Diwan by whoever holds
-- governance.manage. Internal documents are kept in the team's Notion
-- workspace entirely (the Diwan links to it from its menu), so their
-- entries leave the platform and every document here is public.
--
-- The uploaded internal files (governance.library_documents and the
-- private `library` bucket) are left as they are: the Diwan no longer
-- shows them, and the owner decides whether to move them to Notion and
-- remove them (PROGRESS.md).

delete from governance.society_documents where audience = 'internal';

alter table governance.society_documents
  drop constraint society_documents_audience_check,
  add constraint society_documents_audience_check check (audience = 'public');

comment on table governance.society_documents is
  'The Library: the Society''s documents, public at auibsal.org/library. Internal documents are kept in Notion.';
