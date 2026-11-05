-- Book Circle's ballots and their books (A33) refresh the cached program
-- page when they change, like every other published record
-- (private.queue_revalidation). Votes need none: counts show only once a
-- ballot closes.

create trigger revalidate after insert or update or delete on programmes.book_ballots
  for each statement execute function private.queue_revalidation('programmes');
create trigger revalidate after insert or update or delete on programmes.book_choices
  for each statement execute function private.queue_revalidation('programmes');
