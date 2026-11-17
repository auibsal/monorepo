-- Functions the Data API offered that no page used (the owner, Nov 17,
-- 2026: "give each a page or drop it"). None has a page to give it: the
-- Council page reads the seats, the checklist dates itself from the role,
-- the mailing list reads its own topics, and the rest were answered
-- elsewhere. Each goes, with its body, and the API is rebuilt without it.
drop function if exists api.council_members();
drop function if exists api.current_term();
drop function if exists api.pledge_versions();
drop function if exists api.my_topics();
drop function if exists api.is_partner_guest();
drop function if exists api.two_step_from();
drop function if exists api.accepted_unplaced();
drop function if exists api.is_edition_desk(journal.desk);
drop function if exists api.shift_places();

drop function governance.council_members();
drop function private.council_members();
drop function core.current_term();
drop function core.pledge_versions();
drop function private.pledge_versions();
drop function core.my_topics();
drop function private.my_topics();
drop function core.is_partner_guest();
drop function private.is_partner_guest();
drop function access.two_step_from();
drop function private.two_step_from();
drop function journal.accepted_unplaced();
drop function private.accepted_unplaced();
drop function journal.is_edition_desk(journal.desk);
drop function programs.shift_places();
drop function private.shift_places();

select private.build_api();
