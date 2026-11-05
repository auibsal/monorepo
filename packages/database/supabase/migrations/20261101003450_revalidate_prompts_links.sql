-- Open Pages' prompts (A35) and a session's outside links (A37) refresh the
-- cached program pages when they change, like every other published record
-- (private.queue_revalidation). Without these the pages waited for the
-- hourly refresh.

create trigger revalidate after insert or update or delete on programmes.prompts
  for each statement execute function private.queue_revalidation('programmes');
create trigger revalidate after insert or update or delete on events.session_links
  for each statement execute function private.queue_revalidation('events');
