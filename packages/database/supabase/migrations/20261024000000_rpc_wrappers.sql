-- Every function the Nexus or the public site calls through PostgREST was
-- SECURITY DEFINER in an exposed schema, which the Supabase advisor flags
-- (0028, 0029). The bodies move to the private schema, keeping their
-- SECURITY DEFINER rights, names and their own permission checks, and each name
-- in the exposed schema becomes a SECURITY INVOKER wrapper with the same
-- signature, so the apps and the generated types do not change. Grants
-- move with the bodies; the wrappers get the same grants.
--
-- Generated from the local database on 2026-10-23 (111 functions).

-- access.assign_role
alter function access.assign_role(target_user uuid, role_key text, scope_type text, scope_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, title_en text, title_ar text, note text, exception_resolution uuid) set schema private;
create function access.assign_role(target_user uuid, role_key text, scope_type text DEFAULT 'global'::text, scope_id uuid DEFAULT NULL::uuid, starts_at timestamp with time zone DEFAULT now(), ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone, title_en text DEFAULT NULL::text, title_ar text DEFAULT NULL::text, note text DEFAULT NULL::text, exception_resolution uuid DEFAULT NULL::uuid)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.assign_role($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) $$;
revoke all on function access.assign_role(target_user uuid, role_key text, scope_type text, scope_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, title_en text, title_ar text, note text, exception_resolution uuid) from public;
grant execute on function access.assign_role(target_user uuid, role_key text, scope_type text, scope_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, title_en text, title_ar text, note text, exception_resolution uuid) to authenticated;

-- access.end_role_assignment
alter function access.end_role_assignment(assignment_id uuid, ends_at timestamp with time zone) set schema private;
create function access.end_role_assignment(assignment_id uuid, ends_at timestamp with time zone DEFAULT now())
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.end_role_assignment($1, $2) $$;
revoke all on function access.end_role_assignment(assignment_id uuid, ends_at timestamp with time zone) from public;
grant execute on function access.end_role_assignment(assignment_id uuid, ends_at timestamp with time zone) to authenticated, service_role;

-- access.has_permission
alter function access.has_permission(permission text, scope_type text, scope_id uuid) set schema private;
create function access.has_permission(permission text, scope_type text DEFAULT 'global'::text, scope_id uuid DEFAULT NULL::uuid)
returns boolean
language sql stable
security invoker
set search_path = ''
as $$ select private.has_permission($1, $2, $3) $$;
revoke all on function access.has_permission(permission text, scope_type text, scope_id uuid) from public;
grant execute on function access.has_permission(permission text, scope_type text, scope_id uuid) to anon, authenticated, service_role;

-- access.has_permission_anywhere
alter function access.has_permission_anywhere(permission text) set schema private;
create function access.has_permission_anywhere(permission text)
returns boolean
language sql stable
security invoker
set search_path = ''
as $$ select private.has_permission_anywhere($1) $$;
revoke all on function access.has_permission_anywhere(permission text) from public;
grant execute on function access.has_permission_anywhere(permission text) to anon, authenticated, service_role;

-- access.my_permissions
alter function access.my_permissions() set schema private;
create function access.my_permissions()
returns TABLE(permission text, scope_type text, scope_id uuid)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_permissions() $$;
revoke all on function access.my_permissions() from public;
grant execute on function access.my_permissions() to anon, authenticated, service_role;

-- access.needs_two_step
alter function access.needs_two_step() set schema private;
create function access.needs_two_step()
returns boolean
language sql stable
security invoker
set search_path = ''
as $$ select private.needs_two_step() $$;
revoke all on function access.needs_two_step() from public;
grant execute on function access.needs_two_step() to authenticated, service_role;

-- access.oauth_client_info
alter function access.oauth_client_info(client_id uuid) set schema private;
create function access.oauth_client_info(client_id uuid)
returns TABLE(name_en text, name_ar text, areas text[], enabled boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.oauth_client_info($1) $$;
revoke all on function access.oauth_client_info(client_id uuid) from public;
grant execute on function access.oauth_client_info(client_id uuid) to authenticated;

-- charity.campaign_progress
alter function charity.campaign_progress(campaign_id uuid) set schema private;
create function charity.campaign_progress(campaign_id uuid DEFAULT NULL::uuid)
returns TABLE(campaign_id uuid, counted_iqd bigint, pending_iqd bigint, cost_per_unit_iqd bigint, units integer, target_units integer)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.campaign_progress($1) $$;
revoke all on function charity.campaign_progress(campaign_id uuid) from public;
grant execute on function charity.campaign_progress(campaign_id uuid) to anon, authenticated, service_role;

-- content.search
alter function content.search(query text, max_results integer) set schema private;
create function content.search(query text, max_results integer DEFAULT 30)
returns TABLE(kind text, id uuid, slug text, title_en text, title_ar text, snippet text, occurred_at timestamp with time zone, rank real)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.search($1, $2) $$;
revoke all on function content.search(query text, max_results integer) from public;
grant execute on function content.search(query text, max_results integer) to anon, authenticated, service_role;

-- core.admin_overview
alter function core.admin_overview() set schema private;
create function core.admin_overview()
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$ select private.admin_overview() $$;
revoke all on function core.admin_overview() from public;
grant execute on function core.admin_overview() to authenticated, service_role;

-- core.current_semester
alter function core.current_semester() set schema private;
create function core.current_semester()
returns core.semesters
language sql stable
security invoker
set search_path = ''
as $$ select * from private.current_semester() $$;
revoke all on function core.current_semester() from public;
grant execute on function core.current_semester() to anon, authenticated, service_role;

-- core.my_private_profile
alter function core.my_private_profile() set schema private;
create function core.my_private_profile()
returns TABLE(personal_email text, notify_email boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_private_profile() $$;
revoke all on function core.my_private_profile() from public;
grant execute on function core.my_private_profile() to authenticated, service_role;

-- core.previous_semester
alter function core.previous_semester() set schema private;
create function core.previous_semester()
returns core.semesters
language sql stable
security invoker
set search_path = ''
as $$ select * from private.previous_semester() $$;
revoke all on function core.previous_semester() from public;
grant execute on function core.previous_semester() to anon, authenticated, service_role;

-- core.save_push_subscription
alter function core.save_push_subscription(endpoint text, p256dh text, auth text, label text) set schema private;
create function core.save_push_subscription(endpoint text, p256dh text, auth text, label text DEFAULT NULL::text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.save_push_subscription($1, $2, $3, $4) $$;
revoke all on function core.save_push_subscription(endpoint text, p256dh text, auth text, label text) from public;
grant execute on function core.save_push_subscription(endpoint text, p256dh text, auth text, label text) to authenticated;

-- core.telegram_group_code
alter function core.telegram_group_code() set schema private;
create function core.telegram_group_code()
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.telegram_group_code() $$;
revoke all on function core.telegram_group_code() from public;
grant execute on function core.telegram_group_code() to authenticated;

-- core.telegram_link_code
alter function core.telegram_link_code() set schema private;
create function core.telegram_link_code()
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.telegram_link_code() $$;
revoke all on function core.telegram_link_code() from public;
grant execute on function core.telegram_link_code() to authenticated;

-- events.cancel_rsvp
alter function events.cancel_rsvp(event_id uuid) set schema private;
create function events.cancel_rsvp(event_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.cancel_rsvp($1) $$;
revoke all on function events.cancel_rsvp(event_id uuid) from public;
grant execute on function events.cancel_rsvp(event_id uuid) to authenticated, service_role;

-- events.check_in
alter function events.check_in(event_id uuid, ticket_code text, target_user uuid) set schema private;
create function events.check_in(event_id uuid, ticket_code text DEFAULT NULL::text, target_user uuid DEFAULT NULL::uuid)
returns TABLE(user_id uuid, full_name_en text, full_name_ar text, already boolean)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.check_in($1, $2, $3) $$;
revoke all on function events.check_in(event_id uuid, ticket_code text, target_user uuid) from public;
grant execute on function events.check_in(event_id uuid, ticket_code text, target_user uuid) to authenticated, service_role;

-- events.confirmed_count
alter function events.confirmed_count(event_id uuid) set schema private;
create function events.confirmed_count(event_id uuid)
returns integer
language sql stable
security invoker
set search_path = ''
as $$ select private.confirmed_count($1) $$;
revoke all on function events.confirmed_count(event_id uuid) from public;
grant execute on function events.confirmed_count(event_id uuid) to anon, authenticated, service_role;

-- events.find_attendee
alter function events.find_attendee(event_id uuid, query text) set schema private;
create function events.find_attendee(event_id uuid, query text)
returns TABLE(user_id uuid, full_name_en text, full_name_ar text, email text, has_rsvp boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.find_attendee($1, $2) $$;
revoke all on function events.find_attendee(event_id uuid, query text) from public;
grant execute on function events.find_attendee(event_id uuid, query text) to authenticated, service_role;

-- events.rsvp
alter function events.rsvp(event_id uuid, answers jsonb) set schema private;
create function events.rsvp(event_id uuid, answers jsonb DEFAULT '{}'::jsonb)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.rsvp($1, $2) $$;
revoke all on function events.rsvp(event_id uuid, answers jsonb) from public;
grant execute on function events.rsvp(event_id uuid, answers jsonb) to authenticated, service_role;

-- events.waitlist_position
alter function events.waitlist_position(event_id uuid) set schema private;
create function events.waitlist_position(event_id uuid)
returns integer
language sql stable
security invoker
set search_path = ''
as $$ select private.waitlist_position($1) $$;
revoke all on function events.waitlist_position(event_id uuid) from public;
grant execute on function events.waitlist_position(event_id uuid) to authenticated, service_role;

-- governance.approve_spending
alter function governance.approve_spending(approval_id uuid) set schema private;
create function governance.approve_spending(approval_id uuid)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.approve_spending($1) $$;
revoke all on function governance.approve_spending(approval_id uuid) from public;
grant execute on function governance.approve_spending(approval_id uuid) to authenticated, service_role;

-- governance.cast_ballot
alter function governance.cast_ballot(election_id uuid, choices jsonb) set schema private;
create function governance.cast_ballot(election_id uuid, choices jsonb)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.cast_ballot($1, $2) $$;
revoke all on function governance.cast_ballot(election_id uuid, choices jsonb) from public;
grant execute on function governance.cast_ballot(election_id uuid, choices jsonb) to authenticated, service_role;

-- governance.council_roster
alter function governance.council_roster() set schema private;
create function governance.council_roster()
returns TABLE(role text, role_name_en text, role_name_ar text, title_en text, title_ar text, full_name_en text, full_name_ar text, sort integer)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.council_roster() $$;
revoke all on function governance.council_roster() from public;
grant execute on function governance.council_roster() to anon, authenticated, service_role;

-- governance.count_election
alter function governance.count_election(election_id uuid) set schema private;
create function governance.count_election(election_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.count_election($1) $$;
revoke all on function governance.count_election(election_id uuid) from public;
grant execute on function governance.count_election(election_id uuid) to authenticated, service_role;

-- governance.decide_candidate
alter function governance.decide_candidate(candidate_id uuid, approve boolean) set schema private;
create function governance.decide_candidate(candidate_id uuid, approve boolean)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.decide_candidate($1, $2) $$;
revoke all on function governance.decide_candidate(candidate_id uuid, approve boolean) from public;
grant execute on function governance.decide_candidate(candidate_id uuid, approve boolean) to authenticated, service_role;

-- governance.declarable_partners
alter function governance.declarable_partners() set schema private;
create function governance.declarable_partners()
returns TABLE(id uuid, name_en text, name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.declarable_partners() $$;
revoke all on function governance.declarable_partners() from public;
grant execute on function governance.declarable_partners() to authenticated;

-- governance.discard_form_draft
alter function governance.discard_form_draft(submission_id uuid) set schema private;
create function governance.discard_form_draft(submission_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.discard_form_draft($1) $$;
revoke all on function governance.discard_form_draft(submission_id uuid) from public;
grant execute on function governance.discard_form_draft(submission_id uuid) to authenticated;

-- governance.form_queue
alter function governance.form_queue() set schema private;
create function governance.form_queue()
returns TABLE(form_key text, waiting bigint, overdue bigint)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.form_queue() $$;
revoke all on function governance.form_queue() from public;
grant execute on function governance.form_queue() to authenticated;

-- governance.give_notice
alter function governance.give_notice(election_id uuid) set schema private;
create function governance.give_notice(election_id uuid)
returns integer
language sql volatile
security invoker
set search_path = ''
as $$ select private.give_notice($1) $$;
revoke all on function governance.give_notice(election_id uuid) from public;
grant execute on function governance.give_notice(election_id uuid) to authenticated, service_role;

-- governance.handle_form
alter function governance.handle_form(submission_id uuid, status text, office jsonb) set schema private;
create function governance.handle_form(submission_id uuid, status text, office jsonb DEFAULT NULL::jsonb)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.handle_form($1, $2, $3) $$;
revoke all on function governance.handle_form(submission_id uuid, status text, office jsonb) from public;
grant execute on function governance.handle_form(submission_id uuid, status text, office jsonb) to authenticated;

-- governance.joinable_partners
alter function governance.joinable_partners() set schema private;
create function governance.joinable_partners()
returns TABLE(id uuid, name_en text, name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.joinable_partners() $$;
revoke all on function governance.joinable_partners() from public;
grant execute on function governance.joinable_partners() to authenticated;

-- governance.nominate
alter function governance.nominate(position_id uuid, statement_en text, statement_ar text) set schema private;
create function governance.nominate(position_id uuid, statement_en text, statement_ar text DEFAULT NULL::text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.nominate($1, $2, $3) $$;
revoke all on function governance.nominate(position_id uuid, statement_en text, statement_ar text) from public;
grant execute on function governance.nominate(position_id uuid, statement_en text, statement_ar text) to authenticated, service_role;

-- governance.open_voting
alter function governance.open_voting(election_id uuid) set schema private;
create function governance.open_voting(election_id uuid)
returns integer
language sql volatile
security invoker
set search_path = ''
as $$ select private.open_voting($1) $$;
revoke all on function governance.open_voting(election_id uuid) from public;
grant execute on function governance.open_voting(election_id uuid) to authenticated, service_role;

-- governance.public_election_results
alter function governance.public_election_results() set schema private;
create function governance.public_election_results()
returns TABLE(election_id uuid, election_title_en text, election_title_ar text, voting_closes_at timestamp with time zone, eligible_count integer, position_title_en text, position_title_ar text, position_sort integer, winner_name_en text, winner_name_ar text, ron_won boolean, ballots_counted integer)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.public_election_results() $$;
comment on function governance.public_election_results() is $c$Published elections: the outcome per office, ballots counted and turnout. Never the other candidates or the rounds.$c$;
revoke all on function governance.public_election_results() from public;
grant execute on function governance.public_election_results() to anon, authenticated, service_role;

-- governance.public_partners
alter function governance.public_partners() set schema private;
create function governance.public_partners()
returns TABLE(slug text, name_en text, name_ar text, kind text, reach text, url text, description_en text, description_ar text, logo_path text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.public_partners() $$;
revoke all on function governance.public_partners() from public;
grant execute on function governance.public_partners() to anon, authenticated;

-- governance.reject_spending
alter function governance.reject_spending(approval_id uuid, note text) set schema private;
create function governance.reject_spending(approval_id uuid, note text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.reject_spending($1, $2) $$;
revoke all on function governance.reject_spending(approval_id uuid, note text) from public;
grant execute on function governance.reject_spending(approval_id uuid, note text) to authenticated, service_role;

-- governance.request_spending
alter function governance.request_spending(purpose_en text, amount_iqd bigint, programme_id uuid, campaign_id uuid, resolution_id uuid, purpose_ar text) set schema private;
create function governance.request_spending(purpose_en text, amount_iqd bigint, programme_id uuid DEFAULT NULL::uuid, campaign_id uuid DEFAULT NULL::uuid, resolution_id uuid DEFAULT NULL::uuid, purpose_ar text DEFAULT NULL::text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.request_spending($1, $2, $3, $4, $5, $6) $$;
revoke all on function governance.request_spending(purpose_en text, amount_iqd bigint, programme_id uuid, campaign_id uuid, resolution_id uuid, purpose_ar text) from public;
grant execute on function governance.request_spending(purpose_en text, amount_iqd bigint, programme_id uuid, campaign_id uuid, resolution_id uuid, purpose_ar text) to authenticated, service_role;

-- governance.save_form
alter function governance.save_form(form_key text, data jsonb, submission_id uuid, submit boolean, anonymous boolean, subject_id uuid, routing text) set schema private;
create function governance.save_form(form_key text, data jsonb, submission_id uuid DEFAULT NULL::uuid, submit boolean DEFAULT true, anonymous boolean DEFAULT false, subject_id uuid DEFAULT NULL::uuid, routing text DEFAULT 'none'::text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.save_form($1, $2, $3, $4, $5, $6, $7) $$;
revoke all on function governance.save_form(form_key text, data jsonb, submission_id uuid, submit boolean, anonymous boolean, subject_id uuid, routing text) from public;
grant execute on function governance.save_form(form_key text, data jsonb, submission_id uuid, submit boolean, anonymous boolean, subject_id uuid, routing text) to authenticated;

-- governance.sign_partner_agreement
alter function governance.sign_partner_agreement(agreement_id uuid, partner_signatory text, signed_document_path text) set schema private;
create function governance.sign_partner_agreement(agreement_id uuid, partner_signatory text, signed_document_path text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.sign_partner_agreement($1, $2, $3) $$;
revoke all on function governance.sign_partner_agreement(agreement_id uuid, partner_signatory text, signed_document_path text) from public;
grant execute on function governance.sign_partner_agreement(agreement_id uuid, partner_signatory text, signed_document_path text) to authenticated;

-- governance.turnout
alter function governance.turnout(election_id uuid) set schema private;
create function governance.turnout(election_id uuid)
returns TABLE(eligible integer, voted integer)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.turnout($1) $$;
revoke all on function governance.turnout(election_id uuid) from public;
grant execute on function governance.turnout(election_id uuid) to authenticated, service_role;

-- journal.accepted_unplaced
alter function journal.accepted_unplaced() set schema private;
create function journal.accepted_unplaced()
returns TABLE(blind_entry_id uuid, blind_id text, issue_id uuid, title text, category journal.category, language journal.language, decision text, decided_at timestamp with time zone, agreement_signed boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.accepted_unplaced() $$;
revoke all on function journal.accepted_unplaced() from public;
grant execute on function journal.accepted_unplaced() to authenticated, service_role;

-- journal.approve_piece
alter function journal.approve_piece(piece_id uuid, kind text) set schema private;
create function journal.approve_piece(piece_id uuid, kind text)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.approve_piece($1, $2) $$;
revoke all on function journal.approve_piece(piece_id uuid, kind text) from public;
grant execute on function journal.approve_piece(piece_id uuid, kind text) to authenticated, service_role;

-- journal.assign_reader
alter function journal.assign_reader(blind_entry_id uuid, reader_id uuid, read_number integer) set schema private;
create function journal.assign_reader(blind_entry_id uuid, reader_id uuid, read_number integer)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.assign_reader($1, $2, $3) $$;
revoke all on function journal.assign_reader(blind_entry_id uuid, reader_id uuid, read_number integer) from public;
grant execute on function journal.assign_reader(blind_entry_id uuid, reader_id uuid, read_number integer) to authenticated, service_role;

-- journal.author_approve
alter function journal.author_approve(piece_id uuid) set schema private;
create function journal.author_approve(piece_id uuid)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.author_approve($1) $$;
revoke all on function journal.author_approve(piece_id uuid) from public;
grant execute on function journal.author_approve(piece_id uuid) to authenticated, service_role;

-- journal.call_partner_names
alter function journal.call_partner_names(call_id uuid) set schema private;
create function journal.call_partner_names(call_id uuid)
returns TABLE(name_en text, name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.call_partner_names($1) $$;
revoke all on function journal.call_partner_names(call_id uuid) from public;
grant execute on function journal.call_partner_names(call_id uuid) to anon, authenticated;

-- journal.create_staff_piece
alter function journal.create_staff_piece(category journal.category, language journal.language, title_en text, title_ar text, contributor_id uuid, issue_id uuid) set schema private;
create function journal.create_staff_piece(category journal.category, language journal.language, title_en text, title_ar text, contributor_id uuid, issue_id uuid DEFAULT NULL::uuid)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.create_staff_piece($1, $2, $3, $4, $5, $6) $$;
revoke all on function journal.create_staff_piece(category journal.category, language journal.language, title_en text, title_ar text, contributor_id uuid, issue_id uuid) from public;
grant execute on function journal.create_staff_piece(category journal.category, language journal.language, title_en text, title_ar text, contributor_id uuid, issue_id uuid) to authenticated, service_role;

-- journal.current_ads
alter function journal.current_ads() set schema private;
create function journal.current_ads()
returns TABLE(id uuid, kind text, sponsor_en text, sponsor_ar text, headline_en text, headline_ar text, body_en text, body_ar text, action_en text, action_ar text, url text, image_path text, image_alt_en text, image_alt_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.current_ads() $$;
revoke all on function journal.current_ads() from public;
grant execute on function journal.current_ads() to anon, authenticated, service_role;

-- journal.decide
alter function journal.decide(blind_entry_id uuid, decision text, notes text) set schema private;
create function journal.decide(blind_entry_id uuid, decision text, notes text DEFAULT NULL::text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.decide($1, $2, $3) $$;
revoke all on function journal.decide(blind_entry_id uuid, decision text, notes text) from public;
grant execute on function journal.decide(blind_entry_id uuid, decision text, notes text) to authenticated, service_role;

-- journal.decide_named
alter function journal.decide_named(submission_id uuid, decision text, notes text) set schema private;
create function journal.decide_named(submission_id uuid, decision text, notes text DEFAULT NULL::text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.decide_named($1, $2, $3) $$;
revoke all on function journal.decide_named(submission_id uuid, decision text, notes text) from public;
grant execute on function journal.decide_named(submission_id uuid, decision text, notes text) to authenticated, service_role;

-- journal.desk_queue
alter function journal.desk_queue() set schema private;
create function journal.desk_queue()
returns TABLE(submission_id uuid, desk journal.desk, category journal.category, language journal.language, title text, deck text, status journal.submission_status, author_id uuid, author_name_en text, author_name_ar text, pen_name text, file_count integer, intake_note text, intake_returned_at timestamp with time zone, piece_id uuid, created_at timestamp with time zone)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.desk_queue() $$;
revoke all on function journal.desk_queue() from public;
grant execute on function journal.desk_queue() to authenticated, service_role;

-- journal.entry_author
alter function journal.entry_author(blind_entry_id uuid) set schema private;
create function journal.entry_author(blind_entry_id uuid)
returns TABLE(author_name_en text, author_name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.entry_author($1) $$;
revoke all on function journal.entry_author(blind_entry_id uuid) from public;
grant execute on function journal.entry_author(blind_entry_id uuid) to authenticated, service_role;

-- journal.intake_queue
alter function journal.intake_queue(issue_id uuid) set schema private;
create function journal.intake_queue(issue_id uuid)
returns TABLE(submission_id uuid, blind_entry_id uuid, title text, category journal.category, language journal.language, status journal.submission_status, author_name_en text, author_name_ar text, file_count integer, intake_note text, intake_returned_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.intake_queue($1) $$;
revoke all on function journal.intake_queue(issue_id uuid) from public;
grant execute on function journal.intake_queue(issue_id uuid) to authenticated, service_role;

-- journal.my_call_pathways
alter function journal.my_call_pathways() set schema private;
create function journal.my_call_pathways()
returns TABLE(call_id uuid, partner_id uuid, name_en text, name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_call_pathways() $$;
revoke all on function journal.my_call_pathways() from public;
grant execute on function journal.my_call_pathways() to authenticated;

-- journal.my_contributors
alter function journal.my_contributors() set schema private;
create function journal.my_contributors()
returns TABLE(id uuid, slug text, name_en text, name_ar text, bio_en text, bio_ar text, is_pen_name boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_contributors() $$;
revoke all on function journal.my_contributors() from public;
grant execute on function journal.my_contributors() to authenticated;

-- journal.piece_from_entry
alter function journal.piece_from_entry(blind_entry_id uuid) set schema private;
create function journal.piece_from_entry(blind_entry_id uuid)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.piece_from_entry($1) $$;
revoke all on function journal.piece_from_entry(blind_entry_id uuid) from public;
grant execute on function journal.piece_from_entry(blind_entry_id uuid) to authenticated, service_role;

-- journal.piece_thread
alter function journal.piece_thread(piece_id uuid) set schema private;
create function journal.piece_thread(piece_id uuid)
returns TABLE(id bigint, body text, created_at timestamp with time zone, mine boolean, from_author boolean, writer_name_en text, writer_name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.piece_thread($1) $$;
revoke all on function journal.piece_thread(piece_id uuid) from public;
grant execute on function journal.piece_thread(piece_id uuid) to authenticated, service_role;

-- journal.pipeline_issues
alter function journal.pipeline_issues() set schema private;
create function journal.pipeline_issues()
returns TABLE(id uuid, volume integer, number integer, title_en text, title_ar text, status text, can_manage boolean, can_identity boolean, can_decide boolean, can_review boolean, can_advise boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.pipeline_issues() $$;
revoke all on function journal.pipeline_issues() from public;
grant execute on function journal.pipeline_issues() to authenticated, service_role;

-- journal.publish_readiness
alter function journal.publish_readiness(piece_id uuid) set schema private;
create function journal.publish_readiness(piece_id uuid)
returns text
language sql stable
security invoker
set search_path = ''
as $$ select private.publish_readiness($1) $$;
revoke all on function journal.publish_readiness(piece_id uuid) from public;
grant execute on function journal.publish_readiness(piece_id uuid) to authenticated, service_role;

-- journal.reopen_piece
alter function journal.reopen_piece(piece_id uuid) set schema private;
create function journal.reopen_piece(piece_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.reopen_piece($1) $$;
revoke all on function journal.reopen_piece(piece_id uuid) from public;
grant execute on function journal.reopen_piece(piece_id uuid) to authenticated, service_role;

-- journal.request_author_approval
alter function journal.request_author_approval(piece_id uuid) set schema private;
create function journal.request_author_approval(piece_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.request_author_approval($1) $$;
revoke all on function journal.request_author_approval(piece_id uuid) from public;
grant execute on function journal.request_author_approval(piece_id uuid) to authenticated, service_role;

-- journal.return_for_formatting
alter function journal.return_for_formatting(submission_id uuid, note text) set schema private;
create function journal.return_for_formatting(submission_id uuid, note text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.return_for_formatting($1, $2) $$;
revoke all on function journal.return_for_formatting(submission_id uuid, note text) from public;
grant execute on function journal.return_for_formatting(submission_id uuid, note text) to authenticated, service_role;

-- journal.review_team
alter function journal.review_team(issue_id uuid) set schema private;
create function journal.review_team(issue_id uuid)
returns TABLE(user_id uuid, full_name_en text, full_name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.review_team($1) $$;
revoke all on function journal.review_team(issue_id uuid) from public;
grant execute on function journal.review_team(issue_id uuid) to authenticated, service_role;

-- journal.schedule_piece
alter function journal.schedule_piece(piece_id uuid, publish_at timestamp with time zone) set schema private;
create function journal.schedule_piece(piece_id uuid, publish_at timestamp with time zone)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.schedule_piece($1, $2) $$;
revoke all on function journal.schedule_piece(piece_id uuid, publish_at timestamp with time zone) from public;
grant execute on function journal.schedule_piece(piece_id uuid, publish_at timestamp with time zone) to authenticated, service_role;

-- journal.set_front
alter function journal.set_front(piece_id uuid, front_rank smallint) set schema private;
create function journal.set_front(piece_id uuid, front_rank smallint)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.set_front($1, $2) $$;
revoke all on function journal.set_front(piece_id uuid, front_rank smallint) from public;
grant execute on function journal.set_front(piece_id uuid, front_rank smallint) to authenticated, service_role;

-- journal.sign_agreement
alter function journal.sign_agreement(submission_id uuid, signer_name text) set schema private;
create function journal.sign_agreement(submission_id uuid, signer_name text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.sign_agreement($1, $2) $$;
revoke all on function journal.sign_agreement(submission_id uuid, signer_name text) from public;
grant execute on function journal.sign_agreement(submission_id uuid, signer_name text) to authenticated, service_role;

-- journal.submission_partners
alter function journal.submission_partners() set schema private;
create function journal.submission_partners()
returns TABLE(id uuid, name_en text, name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.submission_partners() $$;
revoke all on function journal.submission_partners() from public;
grant execute on function journal.submission_partners() to authenticated;

-- journal.transition_submission
alter function journal.transition_submission(id uuid, to_status journal.submission_status, note text) set schema private;
create function journal.transition_submission(id uuid, to_status journal.submission_status, note text DEFAULT NULL::text)
returns journal.submission_status
language sql volatile
security invoker
set search_path = ''
as $$ select private.transition_submission($1, $2, $3) $$;
revoke all on function journal.transition_submission(id uuid, to_status journal.submission_status, note text) from public;
grant execute on function journal.transition_submission(id uuid, to_status journal.submission_status, note text) to authenticated, service_role;

-- journal.unpublish_piece
alter function journal.unpublish_piece(piece_id uuid, note text) set schema private;
create function journal.unpublish_piece(piece_id uuid, note text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.unpublish_piece($1, $2) $$;
revoke all on function journal.unpublish_piece(piece_id uuid, note text) from public;
grant execute on function journal.unpublish_piece(piece_id uuid, note text) to authenticated, service_role;

-- journal.update_my_contributor
alter function journal.update_my_contributor(contributor_id uuid, name_en text, name_ar text, bio_en text, bio_ar text) set schema private;
create function journal.update_my_contributor(contributor_id uuid, name_en text, name_ar text, bio_en text, bio_ar text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.update_my_contributor($1, $2, $3, $4, $5) $$;
revoke all on function journal.update_my_contributor(contributor_id uuid, name_en text, name_ar text, bio_en text, bio_ar text) from public;
grant execute on function journal.update_my_contributor(contributor_id uuid, name_en text, name_ar text, bio_en text, bio_ar text) to authenticated;

-- journal.withdraw_approval
alter function journal.withdraw_approval(piece_id uuid, kind text) set schema private;
create function journal.withdraw_approval(piece_id uuid, kind text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.withdraw_approval($1, $2) $$;
revoke all on function journal.withdraw_approval(piece_id uuid, kind text) from public;
grant execute on function journal.withdraw_approval(piece_id uuid, kind text) to authenticated, service_role;

-- membership.accept_pledge
alter function membership.accept_pledge(kind membership.pledge_type, version text) set schema private;
create function membership.accept_pledge(kind membership.pledge_type, version text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.accept_pledge($1, $2) $$;
revoke all on function membership.accept_pledge(kind membership.pledge_type, version text) from public;
grant execute on function membership.accept_pledge(kind membership.pledge_type, version text) to authenticated, service_role;

-- membership.activity_count
alter function membership.activity_count(uid uuid) rename to membership_activity_count;
alter function membership.membership_activity_count(uid uuid) set schema private;
create function membership.activity_count(uid uuid DEFAULT auth.uid())
returns integer
language sql stable
security invoker
set search_path = ''
as $$ select private.membership_activity_count($1) $$;
revoke all on function membership.activity_count(uid uuid) from public;
grant execute on function membership.activity_count(uid uuid) to authenticated, service_role;

-- membership.add_manual_activity
alter function membership.add_manual_activity(target_user uuid, note text, occurred_at timestamp with time zone) set schema private;
create function membership.add_manual_activity(target_user uuid, note text, occurred_at timestamp with time zone DEFAULT now())
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.add_manual_activity($1, $2, $3) $$;
revoke all on function membership.add_manual_activity(target_user uuid, note text, occurred_at timestamp with time zone) from public;
grant execute on function membership.add_manual_activity(target_user uuid, note text, occurred_at timestamp with time zone) to authenticated, service_role;

-- membership.calendar_token
alter function membership.calendar_token() set schema private;
create function membership.calendar_token()
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.calendar_token() $$;
revoke all on function membership.calendar_token() from public;
grant execute on function membership.calendar_token() to authenticated, service_role;

-- membership.certificate_signers
alter function membership.certificate_signers(certificate_id uuid) set schema private;
create function membership.certificate_signers(certificate_id uuid)
returns TABLE(president_en text, president_ar text, advisor_en text, advisor_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.certificate_signers($1) $$;
revoke all on function membership.certificate_signers(certificate_id uuid) from public;
grant execute on function membership.certificate_signers(certificate_id uuid) to authenticated;

-- membership.confirm_service
alter function membership.confirm_service(record_id uuid, approve boolean, reason text) set schema private;
create function membership.confirm_service(record_id uuid, approve boolean, reason text DEFAULT NULL::text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.confirm_service($1, $2, $3) $$;
revoke all on function membership.confirm_service(record_id uuid, approve boolean, reason text) from public;
grant execute on function membership.confirm_service(record_id uuid, approve boolean, reason text) to authenticated;

-- membership.current_pledge_version
alter function membership.current_pledge_version(kind membership.pledge_type) set schema private;
create function membership.current_pledge_version(kind membership.pledge_type)
returns text
language sql stable
security invoker
set search_path = ''
as $$ select private.current_pledge_version($1) $$;
revoke all on function membership.current_pledge_version(kind membership.pledge_type) from public;
grant execute on function membership.current_pledge_version(kind membership.pledge_type) to anon, authenticated, service_role;

-- membership.decide_verification
alter function membership.decide_verification(request_id uuid, approve boolean, note text) set schema private;
create function membership.decide_verification(request_id uuid, approve boolean, note text DEFAULT NULL::text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.decide_verification($1, $2, $3) $$;
revoke all on function membership.decide_verification(request_id uuid, approve boolean, note text) from public;
grant execute on function membership.decide_verification(request_id uuid, approve boolean, note text) to authenticated, service_role;

-- membership.directory
alter function membership.directory() set schema private;
create function membership.directory()
returns TABLE(user_id uuid, email text, full_name_en text, full_name_ar text, tier membership.tier, member_since date, verified_at timestamp with time zone, activities integer, voting_member boolean, created_at timestamp with time zone)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.directory() $$;
revoke all on function membership.directory() from public;
grant execute on function membership.directory() to authenticated, service_role;

-- membership.has_current_pledges
alter function membership.has_current_pledges(uid uuid) rename to membership_has_current_pledges;
alter function membership.membership_has_current_pledges(uid uuid) set schema private;
create function membership.has_current_pledges(uid uuid DEFAULT auth.uid())
returns boolean
language sql stable
security invoker
set search_path = ''
as $$ select private.membership_has_current_pledges($1) $$;
revoke all on function membership.has_current_pledges(uid uuid) from public;
grant execute on function membership.has_current_pledges(uid uuid) to anon, authenticated, service_role;

-- membership.is_member
alter function membership.is_member(uid uuid) rename to membership_is_member;
alter function membership.membership_is_member(uid uuid) set schema private;
create function membership.is_member(uid uuid DEFAULT auth.uid())
returns boolean
language sql stable
security invoker
set search_path = ''
as $$ select private.membership_is_member($1) $$;
revoke all on function membership.is_member(uid uuid) from public;
grant execute on function membership.is_member(uid uuid) to anon, authenticated, service_role;

-- membership.is_voting_member
alter function membership.is_voting_member(uid uuid) rename to membership_is_voting_member;
alter function membership.membership_is_voting_member(uid uuid) set schema private;
create function membership.is_voting_member(uid uuid DEFAULT auth.uid())
returns boolean
language sql stable
security invoker
set search_path = ''
as $$ select private.membership_is_voting_member($1) $$;
revoke all on function membership.is_voting_member(uid uuid) from public;
grant execute on function membership.is_voting_member(uid uuid) to authenticated, service_role;

-- membership.my_status
alter function membership.my_status() set schema private;
create function membership.my_status()
returns TABLE(is_member boolean, verified boolean, tier membership.tier, member_since date, activities integer, voting_member boolean, founding_voter boolean, founding_until date, pending_pledges membership.pledge_type[])
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_status() $$;
revoke all on function membership.my_status() from public;
grant execute on function membership.my_status() to authenticated, service_role;

-- membership.record_event_service
alter function membership.record_event_service(event_id uuid, member_id uuid, hours numeric) set schema private;
create function membership.record_event_service(event_id uuid, member_id uuid, hours numeric)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.record_event_service($1, $2, $3) $$;
revoke all on function membership.record_event_service(event_id uuid, member_id uuid, hours numeric) from public;
grant execute on function membership.record_event_service(event_id uuid, member_id uuid, hours numeric) to authenticated;

-- membership.record_shift_service
alter function membership.record_shift_service(shift_id uuid, member_id uuid) set schema private;
create function membership.record_shift_service(shift_id uuid, member_id uuid)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.record_shift_service($1, $2) $$;
revoke all on function membership.record_shift_service(shift_id uuid, member_id uuid) from public;
grant execute on function membership.record_shift_service(shift_id uuid, member_id uuid) to authenticated;

-- membership.reset_calendar_token
alter function membership.reset_calendar_token() set schema private;
create function membership.reset_calendar_token()
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.reset_calendar_token() $$;
revoke all on function membership.reset_calendar_token() from public;
grant execute on function membership.reset_calendar_token() to authenticated, service_role;

-- membership.revoke_certificate
alter function membership.revoke_certificate(certificate_id uuid, reason text) set schema private;
create function membership.revoke_certificate(certificate_id uuid, reason text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.revoke_certificate($1, $2) $$;
revoke all on function membership.revoke_certificate(certificate_id uuid, reason text) from public;
grant execute on function membership.revoke_certificate(certificate_id uuid, reason text) to authenticated;

-- membership.service_hours
alter function membership.service_hours(uid uuid, on_date date) set schema private;
create function membership.service_hours(uid uuid DEFAULT auth.uid(), on_date date DEFAULT NULL::date)
returns numeric
language sql stable
security invoker
set search_path = ''
as $$ select private.service_hours($1, $2) $$;
revoke all on function membership.service_hours(uid uuid, on_date date) from public;
grant execute on function membership.service_hours(uid uuid, on_date date) to authenticated;

-- membership.service_totals
alter function membership.service_totals() set schema private;
create function membership.service_totals()
returns TABLE(user_id uuid, full_name_en text, full_name_ar text, hours numeric, fellowship_eligible boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.service_totals() $$;
revoke all on function membership.service_totals() from public;
grant execute on function membership.service_totals() to authenticated;

-- membership.set_tier
alter function membership.set_tier(target_user uuid, new_tier membership.tier) set schema private;
create function membership.set_tier(target_user uuid, new_tier membership.tier)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.set_tier($1, $2) $$;
revoke all on function membership.set_tier(target_user uuid, new_tier membership.tier) from public;
grant execute on function membership.set_tier(target_user uuid, new_tier membership.tier) to authenticated, service_role;

-- membership.sign_certificate
alter function membership.sign_certificate(certificate_id uuid) set schema private;
create function membership.sign_certificate(certificate_id uuid)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.sign_certificate($1) $$;
revoke all on function membership.sign_certificate(certificate_id uuid) from public;
grant execute on function membership.sign_certificate(certificate_id uuid) to authenticated;

-- membership.verify_certificate
alter function membership.verify_certificate(code text) set schema private;
create function membership.verify_certificate(code text)
returns TABLE(serial text, kind text, status text, holder_en text, holder_ar text, role_en text, role_ar text, period_from date, period_to date, citation_en text, citation_ar text, hours numeric, partner_en text, partner_ar text, issued_at timestamp with time zone, revoked_at timestamp with time zone)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.verify_certificate($1) $$;
revoke all on function membership.verify_certificate(code text) from public;
grant execute on function membership.verify_certificate(code text) to anon, authenticated;

-- programmes.cancel_audition
alter function programmes.cancel_audition(audition_id uuid) set schema private;
create function programmes.cancel_audition(audition_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.cancel_audition($1) $$;
revoke all on function programmes.cancel_audition(audition_id uuid) from public;
grant execute on function programmes.cancel_audition(audition_id uuid) to authenticated;

-- programmes.clear_production_rights
alter function programmes.clear_production_rights(production_id uuid) set schema private;
create function programmes.clear_production_rights(production_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.clear_production_rights($1) $$;
revoke all on function programmes.clear_production_rights(production_id uuid) from public;
grant execute on function programmes.clear_production_rights(production_id uuid) to authenticated;

-- programmes.draft_production_certificates
alter function programmes.draft_production_certificates(production_id uuid) set schema private;
create function programmes.draft_production_certificates(production_id uuid)
returns integer
language sql volatile
security invoker
set search_path = ''
as $$ select private.draft_production_certificates($1) $$;
revoke all on function programmes.draft_production_certificates(production_id uuid) from public;
grant execute on function programmes.draft_production_certificates(production_id uuid) to authenticated;

-- programmes.member_productions
alter function programmes.member_productions() set schema private;
create function programmes.member_productions()
returns TABLE(id uuid, slug text, kind text, stage text, title_en text, title_ar text, summary_en text, summary_ar text, playwright text, poster_path text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.member_productions() $$;
revoke all on function programmes.member_productions() from public;
grant execute on function programmes.member_productions() to authenticated;

-- programmes.moderate_six_words
alter function programmes.moderate_six_words(entry_id uuid, approve boolean) set schema private;
create function programmes.moderate_six_words(entry_id uuid, approve boolean)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.moderate_six_words($1, $2) $$;
revoke all on function programmes.moderate_six_words(entry_id uuid, approve boolean) from public;
grant execute on function programmes.moderate_six_words(entry_id uuid, approve boolean) to authenticated, service_role;

-- programmes.production_partner_choices
alter function programmes.production_partner_choices() set schema private;
create function programmes.production_partner_choices()
returns TABLE(id uuid, name_en text, name_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.production_partner_choices() $$;
revoke all on function programmes.production_partner_choices() from public;
grant execute on function programmes.production_partner_choices() to authenticated;

-- programmes.public_production_credits
alter function programmes.public_production_credits(production_id uuid) set schema private;
create function programmes.public_production_credits(production_id uuid)
returns TABLE(department text, role_en text, role_ar text, name_en text, name_ar text, sort integer)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.public_production_credits($1) $$;
revoke all on function programmes.public_production_credits(production_id uuid) from public;
grant execute on function programmes.public_production_credits(production_id uuid) to anon, authenticated;

-- programmes.public_production_events
alter function programmes.public_production_events(production_id uuid) set schema private;
create function programmes.public_production_events(production_id uuid)
returns TABLE(slug text, title_en text, title_ar text, starts_at timestamp with time zone, venue_en text, venue_ar text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.public_production_events($1) $$;
revoke all on function programmes.public_production_events(production_id uuid) from public;
grant execute on function programmes.public_production_events(production_id uuid) to anon, authenticated;

-- programmes.public_production_partners
alter function programmes.public_production_partners(production_id uuid) set schema private;
create function programmes.public_production_partners(production_id uuid)
returns TABLE(name_en text, name_ar text, url text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.public_production_partners($1) $$;
revoke all on function programmes.public_production_partners(production_id uuid) from public;
grant execute on function programmes.public_production_partners(production_id uuid) to anon, authenticated;

-- programmes.public_productions
alter function programmes.public_productions() set schema private;
create function programmes.public_productions()
returns TABLE(id uuid, slug text, kind text, stage text, title_en text, title_ar text, summary_en text, summary_ar text, playwright text, poster_path text, first_performance timestamp with time zone)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.public_productions() $$;
revoke all on function programmes.public_productions() from public;
grant execute on function programmes.public_productions() to anon, authenticated;

-- programmes.record_production_service
alter function programmes.record_production_service(production_id uuid, member_id uuid, hours numeric) set schema private;
create function programmes.record_production_service(production_id uuid, member_id uuid, hours numeric)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.record_production_service($1, $2, $3) $$;
revoke all on function programmes.record_production_service(production_id uuid, member_id uuid, hours numeric) from public;
grant execute on function programmes.record_production_service(production_id uuid, member_id uuid, hours numeric) to authenticated;

-- programmes.set_credit_visibility
alter function programmes.set_credit_visibility(credit_id uuid, visible boolean) set schema private;
create function programmes.set_credit_visibility(credit_id uuid, visible boolean)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.set_credit_visibility($1, $2) $$;
revoke all on function programmes.set_credit_visibility(credit_id uuid, visible boolean) from public;
grant execute on function programmes.set_credit_visibility(credit_id uuid, visible boolean) to authenticated;

-- programmes.shift_places
alter function programmes.shift_places() set schema private;
create function programmes.shift_places()
returns TABLE(shift_id uuid, taken integer)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.shift_places() $$;
revoke all on function programmes.shift_places() from public;
grant execute on function programmes.shift_places() to authenticated, service_role;

-- programmes.sign_production_report
alter function programmes.sign_production_report(production_id uuid) set schema private;
create function programmes.sign_production_report(production_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.sign_production_report($1) $$;
revoke all on function programmes.sign_production_report(production_id uuid) from public;
grant execute on function programmes.sign_production_report(production_id uuid) to authenticated;

-- programmes.sign_up_for_audition
alter function programmes.sign_up_for_audition(audition_id uuid, interest text) set schema private;
create function programmes.sign_up_for_audition(audition_id uuid, interest text DEFAULT NULL::text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.sign_up_for_audition($1, $2) $$;
revoke all on function programmes.sign_up_for_audition(audition_id uuid, interest text) from public;
grant execute on function programmes.sign_up_for_audition(audition_id uuid, interest text) to authenticated;

-- programmes.sign_up_for_shift
alter function programmes.sign_up_for_shift(shift_id uuid) set schema private;
create function programmes.sign_up_for_shift(shift_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.sign_up_for_shift($1) $$;
revoke all on function programmes.sign_up_for_shift(shift_id uuid) from public;
grant execute on function programmes.sign_up_for_shift(shift_id uuid) to authenticated, service_role;

-- programmes.six_words_wall
alter function programmes.six_words_wall(max_results integer) set schema private;
create function programmes.six_words_wall(max_results integer DEFAULT 200)
returns TABLE(id uuid, text text, language text, author_en text, author_ar text, created_at timestamp with time zone)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.six_words_wall($1) $$;
revoke all on function programmes.six_words_wall(max_results integer) from public;
grant execute on function programmes.six_words_wall(max_results integer) to anon, authenticated, service_role;

