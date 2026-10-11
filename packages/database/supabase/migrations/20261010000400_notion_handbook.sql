-- The officer handbook and the internal documents live in the team's Notion
-- workspace (owner's decision, Oct 10, 2026; docs/platform/notion.md). The
-- Nexus links to them there and keeps no second copy.
--
-- 1. The handbook. Its nine pages were copied to Notion (Handbook and
--    internal documents → Officer handbook) word for word, as they stood in
--    production (never edited since 20261008001700). The Nexus reads where
--    each page now is from the public setting `notion.handbook`, so old
--    links (/handbook?page=…, docs.auibsal.org) still land on the right
--    page. governance.handbook_pages stops taking edits; it is kept, read
--    only, until the owner decides to drop it.
--
-- 2. The internal documents (Founding Proposal, Operations Playbook,
--    Templates & Forms, Printables). Their text is written in Notion; the
--    registry row stays here, with its status, which the Nexus still shows
--    (a draft is never presented as adopted). `notion_url` says where the
--    text is.

alter table governance.society_documents
  add column notion_url text
    check (notion_url ~ '^https://(app\.notion\.com|www\.notion\.so)/[A-Za-z0-9/?=&._-]+$');

comment on column governance.society_documents.notion_url is
  'Where the text is kept in the team''s Notion workspace (internal documents). When set, the Nexus links there instead of showing a body.';

update governance.society_documents set notion_url = v.url
from (values
  ('founding-proposal', 'https://app.notion.com/p/3f588240688681d49d67d9247ffb8b4d'),
  ('operations-playbook', 'https://app.notion.com/p/3f588240688681b4a618f21f097b96d5'),
  ('templates-and-forms', 'https://app.notion.com/p/3f5882406886818eb022f394586ab400'),
  ('printables', 'https://app.notion.com/p/3f588240688681b0a9d5c02564f871af')
) as v (slug, url)
where society_documents.slug = v.slug
  and society_documents.audience = 'internal';

insert into core.settings (key, value, is_public, description) values
  ('notion.handbook', jsonb_build_object(
    'home', 'https://app.notion.com/p/3f58824068868137b482d90e5662067d',
    'pages', jsonb_build_object(
      'introduction', 'https://app.notion.com/p/3f5882406886818d954ccfbb98bd2176',
      'sign-in', 'https://app.notion.com/p/3f588240688681298960f00180c07ead',
      'events', 'https://app.notion.com/p/3f588240688681108927ea04a3337057',
      'journal', 'https://app.notion.com/p/3f5882406886812d8af7c7ee62e9a746',
      'content', 'https://app.notion.com/p/3f588240688681bcbc95f4ddb74f9784',
      'charity', 'https://app.notion.com/p/3f58824068868128bfd7cc9acf85e808',
      'members', 'https://app.notion.com/p/3f588240688681e5b9beff6885b4a3e3',
      'settings', 'https://app.notion.com/p/3f58824068868180a320d6a9df5c0d6d',
      'brand', 'https://app.notion.com/p/3f588240688681dea701fe7240d4031e'
    )
  ), true, 'The officer handbook in the team''s Notion workspace: its first page and each page by its old Nexus slug.')
on conflict (key) do nothing;

-- The handbook stops taking edits in the Nexus.
drop policy "Governance managers edit the handbook" on governance.handbook_pages;
revoke insert, update, delete on governance.handbook_pages from authenticated;

comment on table governance.handbook_pages is
  'Retired on Oct 10, 2026: the officer handbook lives in Notion (setting notion.handbook). Read only until dropped.';
