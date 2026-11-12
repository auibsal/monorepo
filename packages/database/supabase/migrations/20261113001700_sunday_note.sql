-- Hudhud's Sunday note (decisions.md, Hudhud): one post each Sunday in the
-- members' group, listing the week's events and open calls, in place of a
-- post for each new event. Claimed once per Sunday like any group post.

alter table core.telegram_posts drop constraint telegram_posts_kind_check;
alter table core.telegram_posts add constraint telegram_posts_kind_check
  check (kind = any (array['event', 'event_soon', 'piece', 'word', 'brief', 'event_summary', 'announcement', 'sunday_note']));
