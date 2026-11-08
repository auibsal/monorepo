-- Charity collections are a Notion record, not a site feature (decisions.md;
-- owner, Nov 8, 2026: drop the schema). It has been empty since Nov 7 and
-- left the Data API's exposed schemas before this migration ran.
drop schema if exists charity;
