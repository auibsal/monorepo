-- The writing workshop of Nov 17 was canceled; it comes back as a draft,
-- unpublished, to be given a new date (decisions §19). No personal data.
update events.events
set status = 'draft'
where id = '085d9e58-72e3-4dc1-820a-d4b028573e1d' and status = 'canceled';
