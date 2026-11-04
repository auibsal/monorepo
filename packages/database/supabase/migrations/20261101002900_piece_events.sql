-- C16 (the design review, Nov 4, 2026): a piece may name the event it came
-- from or reports on (a Salon evening's write-up, Launch Night's coverage).
-- The newsroom picks it on the piece's page; the public piece links to the
-- event when that event is published and public. An Edition link already
-- exists (issue_id).

alter table journal.pieces
  add column event_id uuid references events.events (id) on delete set null;

create index pieces_event_id_idx on journal.pieces (event_id);

grant update (event_id) on journal.pieces to authenticated;

comment on column journal.pieces.event_id is
  'The event the piece came from or reports on; shown on the piece only when the event is public.';
