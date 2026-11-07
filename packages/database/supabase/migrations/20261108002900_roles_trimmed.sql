-- Roles follow the nine seats and the manuals' teams (audit C9, decisions
-- §5 "Also retired"). The Volunteer Coordinator goes (never held; an
-- event's lead keeps its shifts), and a partner's people are its "Team
-- members" (decisions §10, §12), led by the Partner Lead.

delete from governance.positions where role_key = 'volunteer_coordinator';
update programmes.openings set role = null, is_open = false where role = 'volunteer_coordinator';
delete from access.role_assignments where role = 'volunteer_coordinator';
delete from access.roles where key in ('volunteer_coordinator');

update access.roles
set name_en = 'Team member', name_ar = 'عضو فريق الشريك', name_ar_feminine = 'عضوة فريق الشريك'
where key = 'partner_rep';
