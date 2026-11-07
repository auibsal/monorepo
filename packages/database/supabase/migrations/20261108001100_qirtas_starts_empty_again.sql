-- Qirtas starts empty (decisions §10), take two. 20261108000700 looked for
-- pieces created on October 14 in Baghdad time, but the 22 News pieces
-- were created at 22:30 UTC that day, already the 15th in Baghdad, so it
-- matched none. What sets them apart is that each was backdated: its
-- publication date is earlier than the moment it was made. They stay in
-- the newsroom, unpublished.
update journal.pieces
set status = 'unpublished', front_rank = null
where status = 'published'
  and published_at < created_at - interval '1 hour';
