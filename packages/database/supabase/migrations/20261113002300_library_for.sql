-- The Library's groups come from Notion's "For" field (Everyone, Members,
-- Staff), not from the document's code (fourth prompt, 7m). Audience stays
-- the publish switch; "For" only says whom a published document is for.

alter table governance.society_documents
  add column readers text not null default 'everyone'
    check (readers in ('everyone', 'members', 'staff'));

comment on column governance.society_documents.readers is
  'Whom the document is for, from Notion''s For field (Everyone, Members, Staff): the Library''s group. Audience stays the publish switch.';

-- Until the next sync, what the code used to say.
update governance.society_documents set readers = 'members' where code like 'SAL-MEM-%';
update governance.society_documents set readers = 'staff' where code like 'SAL-MAN-%';
