-- The team's Notion by invitation (the owner, Nov 12, 2026).
--
-- The only way into the workspace is the invitation that comes with a
-- role: the role email carries the workspace's invite link
-- (core.settings `notion.invite_link`, set in the Diwan's Connected
-- panel). Roles held outside the team (partners, parents, Qalam students)
-- do not open Notion. Once, the Diwan sends the invitation to every
-- current holder not yet in the workspace (`notion.catch_up_sent_at`
-- records it, and the panel's catch-up block goes away).

alter table access.roles
  add column in_notion boolean not null default true;

comment on column access.roles.in_notion is
  'Whether holding the role opens the team''s Notion workspace (its invitation comes with the role email).';

update access.roles
set in_notion = false
where key in ('partner_lead', 'partner_rep', 'parent', 'qalam_student');

insert into core.settings (key, value, description)
values
  ('notion.invite_link', 'null'::jsonb,
   'The Notion workspace''s invite link, sent with every role that opens Notion.'),
  ('notion.catch_up_sent_at', 'null'::jsonb,
   'When the one-time Notion invitations went to the role holders not yet in the workspace.')
on conflict (key) do nothing;
