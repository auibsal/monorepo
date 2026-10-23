-- One permissive policy per role and action on every table: Postgres
-- evaluates every permissive policy for a row, and the Supabase advisor
-- flags tables with two or more for the same role and action (0006).
-- Where policies overlapped, they are merged into one whose expression
-- is the OR of the originals; the comment on each merged policy keeps the
-- original names. Restrictive policies and policies that did not overlap
-- are untouched, so the rules stay the same.
--
-- Generated from the local database on 2026-10-23.

-- access.role_assignments
drop policy "Role managers read every role assignment" on access.role_assignments;
drop policy "Users read their own role assignments" on access.role_assignments;
create policy "Select by authenticated" on access.role_assignments
  as permissive for select to authenticated
  using (((( SELECT private.has_permission('roles.assign'::text) AS has_permission) OR ( SELECT private.has_permission('members.manage'::text) AS has_permission))) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on access.role_assignments is $c$Merged from: Role managers read every role assignment; Users read their own role assignments$c$;

-- charity.campaigns
drop policy "Anyone reads published campaigns" on charity.campaigns;
drop policy "Campaign managers read and edit their campaign" on charity.campaigns;
drop policy "Global charity managers create campaigns" on charity.campaigns;
create policy "Anyone reads published campaigns" on charity.campaigns
  as permissive for select to anon
  using ((status <> 'draft'::text));
create policy "Select by authenticated" on charity.campaigns
  as permissive for select to authenticated
  using (((status <> 'draft'::text)) or (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, campaigns.id) AS has_permission)));
comment on policy "Select by authenticated" on charity.campaigns is $c$Merged from: Anyone reads published campaigns; Campaign managers read and edit their campaign$c$;
create policy "Insert by authenticated" on charity.campaigns
  as permissive for insert to authenticated
  with check ((( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, campaigns.id) AS has_permission)) or (( SELECT private.has_permission('charity.manage'::text) AS has_permission)));
comment on policy "Insert by authenticated" on charity.campaigns is $c$Merged from: Campaign managers read and edit their campaign; Global charity managers create campaigns$c$;
create policy "Campaign managers read and edit their campaign (update)" on charity.campaigns
  as permissive for update to authenticated
  using (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, campaigns.id) AS has_permission))
  with check (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, campaigns.id) AS has_permission));
create policy "Campaign managers read and edit their campaign (delete)" on charity.campaigns
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, campaigns.id) AS has_permission));

-- charity.impact_metrics
drop policy "Anyone reads published impact metrics" on charity.impact_metrics;
drop policy "Charity managers manage impact metrics" on charity.impact_metrics;
create policy "Anyone reads published impact metrics" on charity.impact_metrics
  as permissive for select to anon
  using (((published_at IS NOT NULL) AND (published_at <= now())));
create policy "Select by authenticated" on charity.impact_metrics
  as permissive for select to authenticated
  using ((((published_at IS NOT NULL) AND (published_at <= now()))) or (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, impact_metrics.campaign_id) AS has_permission)));
comment on policy "Select by authenticated" on charity.impact_metrics is $c$Merged from: Anyone reads published impact metrics; Charity managers manage impact metrics$c$;
create policy "Charity managers manage impact metrics (insert)" on charity.impact_metrics
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, impact_metrics.campaign_id) AS has_permission));
create policy "Charity managers manage impact metrics (update)" on charity.impact_metrics
  as permissive for update to authenticated
  using (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, impact_metrics.campaign_id) AS has_permission))
  with check (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, impact_metrics.campaign_id) AS has_permission));
create policy "Charity managers manage impact metrics (delete)" on charity.impact_metrics
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, impact_metrics.campaign_id) AS has_permission));

-- charity.partners
drop policy "Anyone reads partners" on charity.partners;
drop policy "Charity managers manage partners" on charity.partners;
create policy "Anyone reads partners" on charity.partners
  as permissive for select to anon
  using (true);
create policy "Select by authenticated" on charity.partners
  as permissive for select to authenticated
  using ((true) or (( SELECT private.has_permission('charity.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on charity.partners is $c$Merged from: Anyone reads partners; Charity managers manage partners$c$;
create policy "Charity managers manage partners (insert)" on charity.partners
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('charity.manage'::text) AS has_permission));
create policy "Charity managers manage partners (update)" on charity.partners
  as permissive for update to authenticated
  using (( SELECT private.has_permission('charity.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('charity.manage'::text) AS has_permission));
create policy "Charity managers manage partners (delete)" on charity.partners
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('charity.manage'::text) AS has_permission));

-- charity.receipts
drop policy "Anyone reads public receipts" on charity.receipts;
drop policy "Charity managers manage receipts" on charity.receipts;
create policy "Anyone reads public receipts" on charity.receipts
  as permissive for select to anon
  using (is_public);
create policy "Select by authenticated" on charity.receipts
  as permissive for select to authenticated
  using ((is_public) or (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, receipts.campaign_id) AS has_permission)));
comment on policy "Select by authenticated" on charity.receipts is $c$Merged from: Anyone reads public receipts; Charity managers manage receipts$c$;
create policy "Charity managers manage receipts (insert)" on charity.receipts
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, receipts.campaign_id) AS has_permission));
create policy "Charity managers manage receipts (update)" on charity.receipts
  as permissive for update to authenticated
  using (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, receipts.campaign_id) AS has_permission))
  with check (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, receipts.campaign_id) AS has_permission));
create policy "Charity managers manage receipts (delete)" on charity.receipts
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, receipts.campaign_id) AS has_permission));

-- content.announcements
drop policy "Anyone reads current public announcements" on content.announcements;
drop policy "Content managers manage announcements" on content.announcements;
drop policy "Members read current member announcements" on content.announcements;
create policy "Anyone reads current public announcements" on content.announcements
  as permissive for select to anon
  using (((audience = 'public'::text) AND (starts_at <= now()) AND ((ends_at IS NULL) OR (ends_at > now()))));
create policy "Select by authenticated" on content.announcements
  as permissive for select to authenticated
  using ((((audience = 'public'::text) AND (starts_at <= now()) AND ((ends_at IS NULL) OR (ends_at > now())))) or (( SELECT private.has_permission('content.manage'::text) AS has_permission)) or (((audience = 'members'::text) AND (starts_at <= now()) AND ((ends_at IS NULL) OR (ends_at > now())) AND ( SELECT private.membership_is_member() AS is_member))));
comment on policy "Select by authenticated" on content.announcements is $c$Merged from: Anyone reads current public announcements; Content managers manage announcements; Members read current member announcements$c$;
create policy "Content managers manage announcements (insert)" on content.announcements
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('content.manage'::text) AS has_permission));
create policy "Content managers manage announcements (update)" on content.announcements
  as permissive for update to authenticated
  using (( SELECT private.has_permission('content.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('content.manage'::text) AS has_permission));
create policy "Content managers manage announcements (delete)" on content.announcements
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('content.manage'::text) AS has_permission));

-- content.homepage_slots
drop policy "Anyone reads homepage slots" on content.homepage_slots;
drop policy "Content managers manage homepage slots" on content.homepage_slots;
create policy "Anyone reads homepage slots" on content.homepage_slots
  as permissive for select to anon
  using (true);
create policy "Select by authenticated" on content.homepage_slots
  as permissive for select to authenticated
  using ((true) or (( SELECT private.has_permission('content.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on content.homepage_slots is $c$Merged from: Anyone reads homepage slots; Content managers manage homepage slots$c$;
create policy "Content managers manage homepage slots (insert)" on content.homepage_slots
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('content.manage'::text) AS has_permission));
create policy "Content managers manage homepage slots (update)" on content.homepage_slots
  as permissive for update to authenticated
  using (( SELECT private.has_permission('content.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('content.manage'::text) AS has_permission));
create policy "Content managers manage homepage slots (delete)" on content.homepage_slots
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('content.manage'::text) AS has_permission));

-- content.media_assets
drop policy "Anyone reads media metadata" on content.media_assets;
drop policy "Content managers manage media" on content.media_assets;
create policy "Anyone reads media metadata" on content.media_assets
  as permissive for select to anon
  using (true);
create policy "Select by authenticated" on content.media_assets
  as permissive for select to authenticated
  using ((true) or (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere)));
comment on policy "Select by authenticated" on content.media_assets is $c$Merged from: Anyone reads media metadata; Content managers manage media$c$;
create policy "Content managers manage media (insert)" on content.media_assets
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere));
create policy "Content managers manage media (update)" on content.media_assets
  as permissive for update to authenticated
  using (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere))
  with check (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere));
create policy "Content managers manage media (delete)" on content.media_assets
  as permissive for delete to authenticated
  using (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere));

-- content.pages
drop policy "Anyone reads published pages" on content.pages;
drop policy "Content managers manage pages" on content.pages;
create policy "Anyone reads published pages" on content.pages
  as permissive for select to anon
  using ((status = 'published'::text));
create policy "Select by authenticated" on content.pages
  as permissive for select to authenticated
  using (((status = 'published'::text)) or (( SELECT private.has_permission('content.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on content.pages is $c$Merged from: Anyone reads published pages; Content managers manage pages$c$;
create policy "Content managers manage pages (insert)" on content.pages
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('content.manage'::text) AS has_permission));
create policy "Content managers manage pages (update)" on content.pages
  as permissive for update to authenticated
  using (( SELECT private.has_permission('content.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('content.manage'::text) AS has_permission));
create policy "Content managers manage pages (delete)" on content.pages
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('content.manage'::text) AS has_permission));

-- core.blackouts
drop policy "Anyone reads blackouts" on core.blackouts;
drop policy "Settings managers write blackouts" on core.blackouts;
create policy "Anyone reads blackouts" on core.blackouts
  as permissive for select to anon
  using (true);
create policy "Select by authenticated" on core.blackouts
  as permissive for select to authenticated
  using ((true) or (( SELECT private.has_permission('settings.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on core.blackouts is $c$Merged from: Anyone reads blackouts; Settings managers write blackouts$c$;
create policy "Settings managers write blackouts (insert)" on core.blackouts
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('settings.manage'::text) AS has_permission));
create policy "Settings managers write blackouts (update)" on core.blackouts
  as permissive for update to authenticated
  using (( SELECT private.has_permission('settings.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('settings.manage'::text) AS has_permission));
create policy "Settings managers write blackouts (delete)" on core.blackouts
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('settings.manage'::text) AS has_permission));

-- core.profiles
drop policy "Member managers read every profile" on core.profiles;
drop policy "Partnership managers read affiliation requesters" on core.profiles;
drop policy "Users read their own profile" on core.profiles;
drop policy "Verified members read other verified members' profiles" on core.profiles;
create policy "Select by authenticated" on core.profiles
  as permissive for select to authenticated
  using (((( SELECT private.has_permission('members.manage'::text) AS has_permission) OR ( SELECT private.has_permission('members.verify'::text) AS has_permission))) or ((( SELECT private.has_permission('partners.manage'::text) AS has_permission) AND (EXISTS ( SELECT 1
   FROM governance.partner_affiliations f
  WHERE (f.user_id = profiles.id))))) or ((id = ( SELECT auth.uid() AS uid))) or ((( SELECT private.is_verified() AS is_verified) AND (verified_at IS NOT NULL))));
comment on policy "Select by authenticated" on core.profiles is $c$Merged from: Member managers read every profile; Partnership managers read affiliation requesters; Users read their own profile; Verified members read other verified members' profiles$c$;

-- core.programmes
drop policy "Anyone reads active programmes" on core.programmes;
drop policy "Programme managers write programmes" on core.programmes;
create policy "Anyone reads active programmes" on core.programmes
  as permissive for select to anon
  using ((is_active OR ( SELECT private.has_permission('programmes.manage'::text) AS has_permission)));
create policy "Select by authenticated" on core.programmes
  as permissive for select to authenticated
  using (((is_active OR ( SELECT private.has_permission('programmes.manage'::text) AS has_permission))) or (( SELECT private.has_permission('programmes.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on core.programmes is $c$Merged from: Anyone reads active programmes; Programme managers write programmes$c$;
create policy "Programme managers write programmes (insert)" on core.programmes
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('programmes.manage'::text) AS has_permission));
create policy "Programme managers write programmes (update)" on core.programmes
  as permissive for update to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('programmes.manage'::text) AS has_permission));
create policy "Programme managers write programmes (delete)" on core.programmes
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text) AS has_permission));

-- core.semesters
drop policy "Anyone reads semesters" on core.semesters;
drop policy "Settings managers write semesters" on core.semesters;
create policy "Anyone reads semesters" on core.semesters
  as permissive for select to anon
  using (true);
create policy "Select by authenticated" on core.semesters
  as permissive for select to authenticated
  using ((true) or (( SELECT private.has_permission('settings.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on core.semesters is $c$Merged from: Anyone reads semesters; Settings managers write semesters$c$;
create policy "Settings managers write semesters (insert)" on core.semesters
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('settings.manage'::text) AS has_permission));
create policy "Settings managers write semesters (update)" on core.semesters
  as permissive for update to authenticated
  using (( SELECT private.has_permission('settings.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('settings.manage'::text) AS has_permission));
create policy "Settings managers write semesters (delete)" on core.semesters
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('settings.manage'::text) AS has_permission));

-- core.settings
drop policy "Anyone reads public settings" on core.settings;
drop policy "Settings managers write settings" on core.settings;
create policy "Anyone reads public settings" on core.settings
  as permissive for select to anon
  using ((is_public OR ( SELECT private.has_permission('settings.manage'::text) AS has_permission)));
create policy "Select by authenticated" on core.settings
  as permissive for select to authenticated
  using (((is_public OR ( SELECT private.has_permission('settings.manage'::text) AS has_permission))) or (( SELECT private.has_permission('settings.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on core.settings is $c$Merged from: Anyone reads public settings; Settings managers write settings$c$;
create policy "Settings managers write settings (insert)" on core.settings
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('settings.manage'::text) AS has_permission));
create policy "Settings managers write settings (update)" on core.settings
  as permissive for update to authenticated
  using (( SELECT private.has_permission('settings.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('settings.manage'::text) AS has_permission));
create policy "Settings managers write settings (delete)" on core.settings
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('settings.manage'::text) AS has_permission));

-- events.check_ins
drop policy "Check-in staff read check-ins" on events.check_ins;
drop policy "Members read their own check-ins" on events.check_ins;
create policy "Select by authenticated" on events.check_ins
  as permissive for select to authenticated
  using ((( SELECT private.can_check_in(check_ins.event_id) AS can_check_in)) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on events.check_ins is $c$Merged from: Check-in staff read check-ins; Members read their own check-ins$c$;

-- events.event_staff
drop policy "Event managers manage event staff" on events.event_staff;
drop policy "Staff read their own duties" on events.event_staff;
create policy "Select by authenticated" on events.event_staff
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM events.events e
  WHERE ((e.id = event_staff.event_id) AND ( SELECT private.has_permission('events.manage'::text, 'programme'::text, e.programme_id) AS has_permission))))) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on events.event_staff is $c$Merged from: Event managers manage event staff; Staff read their own duties$c$;
create policy "Event managers manage event staff (insert)" on events.event_staff
  as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM events.events e
  WHERE ((e.id = event_staff.event_id) AND ( SELECT private.has_permission('events.manage'::text, 'programme'::text, e.programme_id) AS has_permission)))));
create policy "Event managers manage event staff (update)" on events.event_staff
  as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM events.events e
  WHERE ((e.id = event_staff.event_id) AND ( SELECT private.has_permission('events.manage'::text, 'programme'::text, e.programme_id) AS has_permission)))))
  with check ((EXISTS ( SELECT 1
   FROM events.events e
  WHERE ((e.id = event_staff.event_id) AND ( SELECT private.has_permission('events.manage'::text, 'programme'::text, e.programme_id) AS has_permission)))));
create policy "Event managers manage event staff (delete)" on events.event_staff
  as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM events.events e
  WHERE ((e.id = event_staff.event_id) AND ( SELECT private.has_permission('events.manage'::text, 'programme'::text, e.programme_id) AS has_permission)))));

-- events.rsvps
drop policy "Event managers and staff read RSVPs" on events.rsvps;
drop policy "Members read their own RSVPs" on events.rsvps;
create policy "Select by authenticated" on events.rsvps
  as permissive for select to authenticated
  using (((( SELECT private.can_check_in(rsvps.event_id) AS can_check_in) OR (EXISTS ( SELECT 1
   FROM events.events e
  WHERE ((e.id = rsvps.event_id) AND ( SELECT private.has_permission('events.manage'::text, 'programme'::text, e.programme_id) AS has_permission)))))) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on events.rsvps is $c$Merged from: Event managers and staff read RSVPs; Members read their own RSVPs$c$;

-- events.waitlist
drop policy "Event managers read the waitlist" on events.waitlist;
drop policy "Members read their own waitlist places" on events.waitlist;
create policy "Select by authenticated" on events.waitlist
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM events.events e
  WHERE ((e.id = waitlist.event_id) AND ( SELECT private.has_permission('events.manage'::text, 'programme'::text, e.programme_id) AS has_permission))))) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on events.waitlist is $c$Merged from: Event managers read the waitlist; Members read their own waitlist places$c$;

-- governance.candidates
drop policy "Candidates read their own nominations" on governance.candidates;
drop policy "Members read approved candidates" on governance.candidates;
drop policy "The Elections Committee reads every nomination" on governance.candidates;
create policy "Select by authenticated" on governance.candidates
  as permissive for select to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid))) or (((status = 'approved'::text) AND ( SELECT private.membership_is_member() AS is_member) AND ( SELECT private.elections_enabled() AS elections_enabled))) or (( SELECT private.has_permission('elections.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on governance.candidates is $c$Merged from: Candidates read their own nominations; Members read approved candidates; The Elections Committee reads every nomination$c$;

-- governance.council_terms
drop policy "Anyone reads Council terms" on governance.council_terms;
drop policy "Governance managers manage Council terms" on governance.council_terms;
create policy "Anyone reads Council terms" on governance.council_terms
  as permissive for select to anon
  using (true);
create policy "Select by authenticated" on governance.council_terms
  as permissive for select to authenticated
  using ((true) or (( SELECT private.has_permission('governance.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on governance.council_terms is $c$Merged from: Anyone reads Council terms; Governance managers manage Council terms$c$;
create policy "Governance managers manage Council terms (insert)" on governance.council_terms
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('governance.manage'::text) AS has_permission));
create policy "Governance managers manage Council terms (update)" on governance.council_terms
  as permissive for update to authenticated
  using (( SELECT private.has_permission('governance.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('governance.manage'::text) AS has_permission));
create policy "Governance managers manage Council terms (delete)" on governance.council_terms
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('governance.manage'::text) AS has_permission));

-- governance.election_results
drop policy "Members read published results" on governance.election_results;
drop policy "The Elections Committee reads results" on governance.election_results;
create policy "Select by authenticated" on governance.election_results
  as permissive for select to authenticated
  using ((((EXISTS ( SELECT 1
   FROM governance.elections e
  WHERE ((e.id = election_results.election_id) AND (e.status = 'published'::text)))) AND ( SELECT private.membership_is_member() AS is_member))) or (( SELECT private.has_permission('elections.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on governance.election_results is $c$Merged from: Members read published results; The Elections Committee reads results$c$;

-- governance.elections
drop policy "Members read elections once announced" on governance.elections;
drop policy "The Elections Committee manages elections" on governance.elections;
create policy "Select by authenticated" on governance.elections
  as permissive for select to authenticated
  using (((((status <> 'draft'::text) AND ( SELECT private.membership_is_member() AS is_member) AND ( SELECT private.elections_enabled() AS elections_enabled)) OR ( SELECT private.has_permission('elections.manage'::text) AS has_permission))) or (( SELECT private.has_permission('elections.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on governance.elections is $c$Merged from: Members read elections once announced; The Elections Committee manages elections$c$;
create policy "The Elections Committee manages elections (insert)" on governance.elections
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('elections.manage'::text) AS has_permission));
create policy "The Elections Committee manages elections (update)" on governance.elections
  as permissive for update to authenticated
  using (( SELECT private.has_permission('elections.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('elections.manage'::text) AS has_permission));
create policy "The Elections Committee manages elections (delete)" on governance.elections
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('elections.manage'::text) AS has_permission));

-- governance.library_documents
drop policy "Governance managers manage the library" on governance.library_documents;
drop policy "Role holders read the role library" on governance.library_documents;
create policy "Select by authenticated" on governance.library_documents
  as permissive for select to authenticated
  using ((( SELECT private.has_permission('governance.manage'::text) AS has_permission)) or ((((audience = 'role'::text) AND ( SELECT private.has_permission_anywhere('library.read'::text) AS has_permission_anywhere)) OR ( SELECT private.has_permission('library.council'::text) AS has_permission))));
comment on policy "Select by authenticated" on governance.library_documents is $c$Merged from: Governance managers manage the library; Role holders read the role library$c$;
create policy "Governance managers manage the library (insert)" on governance.library_documents
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('governance.manage'::text) AS has_permission));
create policy "Governance managers manage the library (update)" on governance.library_documents
  as permissive for update to authenticated
  using (( SELECT private.has_permission('governance.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('governance.manage'::text) AS has_permission));
create policy "Governance managers manage the library (delete)" on governance.library_documents
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('governance.manage'::text) AS has_permission));

-- governance.member_offers
drop policy "Partnership managers keep offers" on governance.member_offers;
drop policy "Verified members read current offers" on governance.member_offers;
create policy "Select by authenticated" on governance.member_offers
  as permissive for select to authenticated
  using ((( SELECT private.has_permission('partners.manage'::text) AS has_permission)) or (((is_published AND (starts_on <= CURRENT_DATE) AND ((ends_on IS NULL) OR (ends_on >= CURRENT_DATE)) AND ( SELECT private.membership_is_member() AS is_member) AND ('member_offer'::text = ANY (private.partner_grants(partner_id)))) OR ( SELECT private.has_permission('partners.manage'::text) AS has_permission))));
comment on policy "Select by authenticated" on governance.member_offers is $c$Merged from: Partnership managers keep offers; Verified members read current offers$c$;
create policy "Partnership managers keep offers (insert)" on governance.member_offers
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('partners.manage'::text) AS has_permission));
create policy "Partnership managers keep offers (update)" on governance.member_offers
  as permissive for update to authenticated
  using (( SELECT private.has_permission('partners.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('partners.manage'::text) AS has_permission));
create policy "Partnership managers keep offers (delete)" on governance.member_offers
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('partners.manage'::text) AS has_permission));

-- governance.minutes
drop policy "Members read adopted minutes" on governance.minutes;
drop policy "Minute-takers read and write minutes" on governance.minutes;
create policy "Select by authenticated" on governance.minutes
  as permissive for select to authenticated
  using ((((status = 'adopted'::text) AND ( SELECT private.membership_is_member() AS is_member))) or ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission))));
comment on policy "Select by authenticated" on governance.minutes is $c$Merged from: Members read adopted minutes; Minute-takers read and write minutes$c$;
create policy "Minute-takers read and write minutes (insert)" on governance.minutes
  as permissive for insert to authenticated
  with check ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));
create policy "Minute-takers read and write minutes (update)" on governance.minutes
  as permissive for update to authenticated
  using ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)))
  with check ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));
create policy "Minute-takers read and write minutes (delete)" on governance.minutes
  as permissive for delete to authenticated
  using ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));

-- governance.partners
drop policy "Partnership managers keep the register" on governance.partners;
drop policy "Partnership managers read the register" on governance.partners;
create policy "Select by authenticated" on governance.partners
  as permissive for select to authenticated
  using ((( SELECT private.has_permission('partners.manage'::text) AS has_permission)) or ((( SELECT private.has_permission('partners.manage'::text) AS has_permission) OR ( SELECT private.has_permission('partners.sign'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission))));
comment on policy "Select by authenticated" on governance.partners is $c$Merged from: Partnership managers keep the register; Partnership managers read the register$c$;
create policy "Partnership managers keep the register (insert)" on governance.partners
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('partners.manage'::text) AS has_permission));
create policy "Partnership managers keep the register (update)" on governance.partners
  as permissive for update to authenticated
  using (( SELECT private.has_permission('partners.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('partners.manage'::text) AS has_permission));
create policy "Partnership managers keep the register (delete)" on governance.partners
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('partners.manage'::text) AS has_permission));

-- governance.positions
drop policy "Members read positions of announced elections" on governance.positions;
drop policy "The Elections Committee manages positions" on governance.positions;
create policy "Select by authenticated" on governance.positions
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM governance.elections e
  WHERE ((e.id = positions.election_id) AND (((e.status <> 'draft'::text) AND ( SELECT private.membership_is_member() AS is_member) AND ( SELECT private.elections_enabled() AS elections_enabled)) OR ( SELECT private.has_permission('elections.manage'::text) AS has_permission)))))) or (( SELECT private.has_permission('elections.manage'::text) AS has_permission)));
comment on policy "Select by authenticated" on governance.positions is $c$Merged from: Members read positions of announced elections; The Elections Committee manages positions$c$;
create policy "The Elections Committee manages positions (insert)" on governance.positions
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('elections.manage'::text) AS has_permission));
create policy "The Elections Committee manages positions (update)" on governance.positions
  as permissive for update to authenticated
  using (( SELECT private.has_permission('elections.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('elections.manage'::text) AS has_permission));
create policy "The Elections Committee manages positions (delete)" on governance.positions
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('elections.manage'::text) AS has_permission));

-- governance.resolutions
drop policy "Anyone reads adopted resolutions" on governance.resolutions;
drop policy "Minute-takers read and write resolutions" on governance.resolutions;
create policy "Anyone reads adopted resolutions" on governance.resolutions
  as permissive for select to anon
  using ((status = 'adopted'::text));
create policy "Select by authenticated" on governance.resolutions
  as permissive for select to authenticated
  using (((status = 'adopted'::text)) or ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission))));
comment on policy "Select by authenticated" on governance.resolutions is $c$Merged from: Anyone reads adopted resolutions; Minute-takers read and write resolutions$c$;
create policy "Minute-takers read and write resolutions (insert)" on governance.resolutions
  as permissive for insert to authenticated
  with check ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));
create policy "Minute-takers read and write resolutions (update)" on governance.resolutions
  as permissive for update to authenticated
  using ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)))
  with check ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));
create policy "Minute-takers read and write resolutions (delete)" on governance.resolutions
  as permissive for delete to authenticated
  using ((( SELECT private.has_permission('governance.minutes.write'::text) AS has_permission) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));

-- governance.society_documents
drop policy "Everyone reads the public documents" on governance.society_documents;
drop policy "Governance managers keep the documents" on governance.society_documents;
drop policy "Officers read the internal documents" on governance.society_documents;
create policy "Everyone reads the public documents" on governance.society_documents
  as permissive for select to anon
  using ((audience = 'public'::text));
create policy "Select by authenticated" on governance.society_documents
  as permissive for select to authenticated
  using (((audience = 'public'::text)) or (( SELECT private.has_permission('governance.manage'::text) AS has_permission)) or (((audience = 'internal'::text) AND (( SELECT private.has_permission_anywhere('library.read'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)))));
comment on policy "Select by authenticated" on governance.society_documents is $c$Merged from: Everyone reads the public documents; Governance managers keep the documents; Officers read the internal documents$c$;
create policy "Governance managers keep the documents (insert)" on governance.society_documents
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('governance.manage'::text) AS has_permission));
create policy "Governance managers keep the documents (update)" on governance.society_documents
  as permissive for update to authenticated
  using (( SELECT private.has_permission('governance.manage'::text) AS has_permission))
  with check (( SELECT private.has_permission('governance.manage'::text) AS has_permission));
create policy "Governance managers keep the documents (delete)" on governance.society_documents
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('governance.manage'::text) AS has_permission));

-- journal.agreements
drop policy "Authors read their own agreements" on journal.agreements;
drop policy "Submissions Managers read agreements" on journal.agreements;
create policy "Select by authenticated" on journal.agreements
  as permissive for select to authenticated
  using (((signed_by = ( SELECT auth.uid() AS uid))) or ((EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = agreements.submission_id) AND ( SELECT private.can_view_identity(private.call_issue(s.call_id)) AS can_view_identity))))));
comment on policy "Select by authenticated" on journal.agreements is $c$Merged from: Authors read their own agreements; Submissions Managers read agreements$c$;

-- journal.assignments
drop policy "Issue editors and the Submissions Manager read assignments" on journal.assignments;
drop policy "Readers read their own assignments" on journal.assignments;
create policy "Select by authenticated" on journal.assignments
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.blind_entries b
  WHERE ((b.id = assignments.blind_entry_id) AND (( SELECT private.is_issue_editor(b.issue_id) AS is_issue_editor) OR ( SELECT private.can_view_identity(b.issue_id) AS can_view_identity)))))) or ((reader_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on journal.assignments is $c$Merged from: Issue editors and the Submissions Manager read assignments; Readers read their own assignments$c$;

-- journal.blind_entries
drop policy "Advisory Board reads flagged entries" on journal.blind_entries;
drop policy "Assigned readers read their blind entries" on journal.blind_entries;
drop policy "Issue editors read blind entries" on journal.blind_entries;
create policy "Select by authenticated" on journal.blind_entries
  as permissive for select to authenticated
  using (((flagged AND ( SELECT private.has_permission('journal.advise'::text, 'issue'::text, blind_entries.issue_id) AS has_permission))) or (( SELECT private.is_assigned_reader(blind_entries.id) AS is_assigned_reader)) or ((( SELECT private.is_issue_editor(blind_entries.issue_id) AS is_issue_editor) OR ( SELECT private.can_view_identity(blind_entries.issue_id) AS can_view_identity))));
comment on policy "Select by authenticated" on journal.blind_entries is $c$Merged from: Advisory Board reads flagged entries; Assigned readers read their blind entries; Issue editors read blind entries$c$;

-- journal.call_partners
drop policy "Journal managers choose a call's partners" on journal.call_partners;
drop policy "Journal managers read a call's partners" on journal.call_partners;
create policy "Select by authenticated" on journal.call_partners
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.calls c
  WHERE ((c.id = call_partners.call_id) AND ( SELECT private.has_permission('journal.manage'::text, 'issue'::text, c.issue_id) AS has_permission))))) or (( SELECT private.has_permission_anywhere('journal.manage'::text) AS has_permission_anywhere)));
comment on policy "Select by authenticated" on journal.call_partners is $c$Merged from: Journal managers choose a call's partners; Journal managers read a call's partners$c$;
create policy "Journal managers choose a call's partners (insert)" on journal.call_partners
  as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM journal.calls c
  WHERE ((c.id = call_partners.call_id) AND ( SELECT private.has_permission('journal.manage'::text, 'issue'::text, c.issue_id) AS has_permission)))));
create policy "Journal managers choose a call's partners (update)" on journal.call_partners
  as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM journal.calls c
  WHERE ((c.id = call_partners.call_id) AND ( SELECT private.has_permission('journal.manage'::text, 'issue'::text, c.issue_id) AS has_permission)))))
  with check ((EXISTS ( SELECT 1
   FROM journal.calls c
  WHERE ((c.id = call_partners.call_id) AND ( SELECT private.has_permission('journal.manage'::text, 'issue'::text, c.issue_id) AS has_permission)))));
create policy "Journal managers choose a call's partners (delete)" on journal.call_partners
  as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM journal.calls c
  WHERE ((c.id = call_partners.call_id) AND ( SELECT private.has_permission('journal.manage'::text, 'issue'::text, c.issue_id) AS has_permission)))));

-- journal.calls
drop policy "Anyone reads published calls" on journal.calls;
drop policy "Journal managers manage calls" on journal.calls;
create policy "Anyone reads published calls" on journal.calls
  as permissive for select to anon
  using (is_published);
create policy "Select by authenticated" on journal.calls
  as permissive for select to authenticated
  using ((is_published) or (( SELECT private.has_permission('journal.manage'::text, 'issue'::text, calls.issue_id) AS has_permission)));
comment on policy "Select by authenticated" on journal.calls is $c$Merged from: Anyone reads published calls; Journal managers manage calls$c$;
create policy "Journal managers manage calls (insert)" on journal.calls
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('journal.manage'::text, 'issue'::text, calls.issue_id) AS has_permission));
create policy "Journal managers manage calls (update)" on journal.calls
  as permissive for update to authenticated
  using (( SELECT private.has_permission('journal.manage'::text, 'issue'::text, calls.issue_id) AS has_permission))
  with check (( SELECT private.has_permission('journal.manage'::text, 'issue'::text, calls.issue_id) AS has_permission));
create policy "Journal managers manage calls (delete)" on journal.calls
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('journal.manage'::text, 'issue'::text, calls.issue_id) AS has_permission));

-- journal.contributors
drop policy "Anyone reads contributors with published work" on journal.contributors;
drop policy "Contributors read their own record" on journal.contributors;
drop policy "Piece editors manage contributors" on journal.contributors;
create policy "Anyone reads contributors with published work" on journal.contributors
  as permissive for select to anon
  using ((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.contributor_id = contributors.id) AND (p.status = 'published'::text) AND (p.published_at <= now())))));
create policy "Select by authenticated" on journal.contributors
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.contributor_id = contributors.id) AND (p.status = 'published'::text) AND (p.published_at <= now()))))) or ((user_id = ( SELECT auth.uid() AS uid))) or ((( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.approve'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.copy'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.news'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.letters'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.gallery'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.video'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.voices'::text) AS has_permission_anywhere))));
comment on policy "Select by authenticated" on journal.contributors is $c$Merged from: Anyone reads contributors with published work; Contributors read their own record; Piece editors manage contributors$c$;
create policy "Piece editors manage contributors (insert)" on journal.contributors
  as permissive for insert to authenticated
  with check ((( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.approve'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.copy'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.news'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.letters'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.gallery'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.video'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.voices'::text) AS has_permission_anywhere)));
create policy "Piece editors manage contributors (update)" on journal.contributors
  as permissive for update to authenticated
  using ((( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.approve'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.copy'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.news'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.letters'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.gallery'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.video'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.voices'::text) AS has_permission_anywhere)))
  with check ((( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.approve'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.copy'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.news'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.letters'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.gallery'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.video'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.voices'::text) AS has_permission_anywhere)));
create policy "Piece editors manage contributors (delete)" on journal.contributors
  as permissive for delete to authenticated
  using ((( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.approve'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.copy'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.news'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.letters'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.gallery'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.video'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.edit.voices'::text) AS has_permission_anywhere)));

-- journal.corrections
drop policy "Anyone reads corrections to published pieces" on journal.corrections;
drop policy "Piece editors read and add corrections" on journal.corrections;
create policy "Anyone reads corrections to published pieces" on journal.corrections
  as permissive for select to anon
  using ((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = corrections.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now())))));
create policy "Select by authenticated" on journal.corrections
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = corrections.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now()))))) or (( SELECT private.piece_editor(corrections.piece_id) AS piece_editor)));
comment on policy "Select by authenticated" on journal.corrections is $c$Merged from: Anyone reads corrections to published pieces; Piece editors read and add corrections$c$;

-- journal.decisions
drop policy "Desk editors read decisions on named work" on journal.decisions;
drop policy "The review team reads decisions" on journal.decisions;
create policy "Select by authenticated" on journal.decisions
  as permissive for select to authenticated
  using ((((submission_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = decisions.submission_id) AND ( SELECT private.is_desk_editor(s.desk) AS is_desk_editor)))))) or ((EXISTS ( SELECT 1
   FROM journal.blind_entries b
  WHERE ((b.id = decisions.blind_entry_id) AND (( SELECT private.is_issue_editor(b.issue_id) AS is_issue_editor) OR ( SELECT private.can_view_identity(b.issue_id) AS can_view_identity) OR ( SELECT private.is_assigned_reader(b.id) AS is_assigned_reader)))))));
comment on policy "Select by authenticated" on journal.decisions is $c$Merged from: Desk editors read decisions on named work; The review team reads decisions$c$;

-- journal.issues
drop policy "Anyone reads published issues" on journal.issues;
drop policy "Chiefs read and write editions" on journal.issues;
drop policy "Global journal publishers create issues" on journal.issues;
drop policy "Journal publishers read and write issues" on journal.issues;
create policy "Anyone reads published issues" on journal.issues
  as permissive for select to anon
  using (((status = 'published'::text) AND (published_at <= now())));
create policy "Select by authenticated" on journal.issues
  as permissive for select to authenticated
  using ((((status = 'published'::text) AND (published_at <= now()))) or (( SELECT private.has_permission('journal.approve'::text, 'issue'::text, issues.id) AS has_permission)) or (( SELECT private.has_permission('journal.publish'::text, 'issue'::text, issues.id) AS has_permission)));
comment on policy "Select by authenticated" on journal.issues is $c$Merged from: Anyone reads published issues; Chiefs read and write editions; Journal publishers read and write issues$c$;
create policy "Insert by authenticated" on journal.issues
  as permissive for insert to authenticated
  with check ((( SELECT private.has_permission('journal.approve'::text, 'issue'::text, issues.id) AS has_permission)) or (( SELECT private.has_permission('journal.publish'::text) AS has_permission)) or (( SELECT private.has_permission('journal.publish'::text, 'issue'::text, issues.id) AS has_permission)));
comment on policy "Insert by authenticated" on journal.issues is $c$Merged from: Chiefs read and write editions; Global journal publishers create issues; Journal publishers read and write issues$c$;
create policy "Update by authenticated" on journal.issues
  as permissive for update to authenticated
  using ((( SELECT private.has_permission('journal.approve'::text, 'issue'::text, issues.id) AS has_permission)) or (( SELECT private.has_permission('journal.publish'::text, 'issue'::text, issues.id) AS has_permission)))
  with check ((( SELECT private.has_permission('journal.approve'::text, 'issue'::text, issues.id) AS has_permission)) or (( SELECT private.has_permission('journal.publish'::text, 'issue'::text, issues.id) AS has_permission)));
comment on policy "Update by authenticated" on journal.issues is $c$Merged from: Chiefs read and write editions; Journal publishers read and write issues$c$;
create policy "Delete by authenticated" on journal.issues
  as permissive for delete to authenticated
  using ((( SELECT private.has_permission('journal.approve'::text, 'issue'::text, issues.id) AS has_permission)) or (( SELECT private.has_permission('journal.publish'::text, 'issue'::text, issues.id) AS has_permission)));
comment on policy "Delete by authenticated" on journal.issues is $c$Merged from: Chiefs read and write editions; Journal publishers read and write issues$c$;

-- journal.piece_bodies
drop policy "Anyone reads the text of published public pieces" on journal.piece_bodies;
drop policy "Authors read their own piece text" on journal.piece_bodies;
drop policy "Members read the text of published members-only pieces" on journal.piece_bodies;
drop policy "Piece editors read piece text" on journal.piece_bodies;
create policy "Anyone reads the text of published public pieces" on journal.piece_bodies
  as permissive for select to anon
  using ((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = piece_bodies.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now()) AND (NOT p.members_only)))));
create policy "Select by authenticated" on journal.piece_bodies
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = piece_bodies.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now()) AND (NOT p.members_only))))) or (( SELECT private.is_piece_author(piece_bodies.piece_id) AS is_piece_author)) or ((( SELECT private.membership_is_member() AS is_member) AND (EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = piece_bodies.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now())))))) or (( SELECT private.piece_editor(piece_bodies.piece_id) AS piece_editor)));
comment on policy "Select by authenticated" on journal.piece_bodies is $c$Merged from: Anyone reads the text of published public pieces; Authors read their own piece text; Members read the text of published members-only pieces; Piece editors read piece text$c$;

-- journal.piece_credits
drop policy "Anyone reads credits on published pieces" on journal.piece_credits;
drop policy "Piece editors manage credits" on journal.piece_credits;
create policy "Anyone reads credits on published pieces" on journal.piece_credits
  as permissive for select to anon
  using ((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = piece_credits.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now())))));
create policy "Select by authenticated" on journal.piece_credits
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = piece_credits.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now()))))) or (( SELECT private.piece_editor(piece_credits.piece_id) AS piece_editor)));
comment on policy "Select by authenticated" on journal.piece_credits is $c$Merged from: Anyone reads credits on published pieces; Piece editors manage credits$c$;
create policy "Piece editors manage credits (insert)" on journal.piece_credits
  as permissive for insert to authenticated
  with check (( SELECT private.piece_editor(piece_credits.piece_id) AS piece_editor));
create policy "Piece editors manage credits (update)" on journal.piece_credits
  as permissive for update to authenticated
  using (( SELECT private.piece_editor(piece_credits.piece_id) AS piece_editor))
  with check (( SELECT private.piece_editor(piece_credits.piece_id) AS piece_editor));
create policy "Piece editors manage credits (delete)" on journal.piece_credits
  as permissive for delete to authenticated
  using (( SELECT private.piece_editor(piece_credits.piece_id) AS piece_editor));

-- journal.piece_media
drop policy "Anyone reads media of published pieces" on journal.piece_media;
drop policy "Piece editors and authors read media" on journal.piece_media;
drop policy "Piece editors manage media" on journal.piece_media;
create policy "Anyone reads media of published pieces" on journal.piece_media
  as permissive for select to anon
  using ((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = piece_media.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now())))));
create policy "Select by authenticated" on journal.piece_media
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.pieces p
  WHERE ((p.id = piece_media.piece_id) AND (p.status = 'published'::text) AND (p.published_at <= now()))))) or ((( SELECT private.piece_editor(piece_media.piece_id) AS piece_editor) OR ( SELECT private.is_piece_author(piece_media.piece_id) AS is_piece_author))) or (( SELECT private.piece_editor(piece_media.piece_id) AS piece_editor)));
comment on policy "Select by authenticated" on journal.piece_media is $c$Merged from: Anyone reads media of published pieces; Piece editors and authors read media; Piece editors manage media$c$;
create policy "Piece editors manage media (insert)" on journal.piece_media
  as permissive for insert to authenticated
  with check (( SELECT private.piece_editor(piece_media.piece_id) AS piece_editor));
create policy "Piece editors manage media (update)" on journal.piece_media
  as permissive for update to authenticated
  using (( SELECT private.piece_editor(piece_media.piece_id) AS piece_editor))
  with check (( SELECT private.piece_editor(piece_media.piece_id) AS piece_editor));
create policy "Piece editors manage media (delete)" on journal.piece_media
  as permissive for delete to authenticated
  using (( SELECT private.piece_editor(piece_media.piece_id) AS piece_editor));

-- journal.pieces
drop policy "Anyone reads published pieces" on journal.pieces;
drop policy "Authors read their own pieces" on journal.pieces;
drop policy "Piece editors read pieces" on journal.pieces;
create policy "Anyone reads published pieces" on journal.pieces
  as permissive for select to anon
  using (((status = 'published'::text) AND (published_at <= now())));
create policy "Select by authenticated" on journal.pieces
  as permissive for select to authenticated
  using ((((status = 'published'::text) AND (published_at <= now()))) or (( SELECT private.is_piece_author(pieces.id) AS is_piece_author)) or (( SELECT private.can_edit_piece(pieces.desk, pieces.issue_id) AS can_edit_piece)));
comment on policy "Select by authenticated" on journal.pieces is $c$Merged from: Anyone reads published pieces; Authors read their own pieces; Piece editors read pieces$c$;

-- journal.puzzles
drop policy "Anyone reads published puzzles" on journal.puzzles;
drop policy "Puzzle editors read puzzles" on journal.puzzles;
create policy "Anyone reads published puzzles" on journal.puzzles
  as permissive for select to anon
  using (((status = 'published'::text) AND (published_at <= now())));
create policy "Select by authenticated" on journal.puzzles
  as permissive for select to authenticated
  using ((((status = 'published'::text) AND (published_at <= now()))) or (( SELECT private.can_edit_puzzles() AS can_edit_puzzles)));
comment on policy "Select by authenticated" on journal.puzzles is $c$Merged from: Anyone reads published puzzles; Puzzle editors read puzzles$c$;

-- journal.scores
drop policy "Issue editors read every score" on journal.scores;
drop policy "Readers read their own scores" on journal.scores;
create policy "Select by authenticated" on journal.scores
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM (journal.assignments a
     JOIN journal.blind_entries b ON ((b.id = a.blind_entry_id)))
  WHERE ((a.id = scores.assignment_id) AND ( SELECT private.is_issue_editor(b.issue_id) AS is_issue_editor))))) or ((EXISTS ( SELECT 1
   FROM journal.assignments a
  WHERE ((a.id = scores.assignment_id) AND (a.reader_id = ( SELECT auth.uid() AS uid)))))));
comment on policy "Select by authenticated" on journal.scores is $c$Merged from: Issue editors read every score; Readers read their own scores$c$;

-- journal.status_history
drop policy "Authors read their own status history" on journal.status_history;
drop policy "Desk editors read named status history" on journal.status_history;
drop policy "Submissions Managers read status history" on journal.status_history;
create policy "Select by authenticated" on journal.status_history
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = status_history.submission_id) AND (s.author_id = ( SELECT auth.uid() AS uid)))))) or ((EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = status_history.submission_id) AND (s.call_id IS NULL) AND ( SELECT private.is_desk_editor(s.desk) AS is_desk_editor))))) or ((EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = status_history.submission_id) AND ( SELECT private.can_view_identity(private.call_issue(s.call_id)) AS can_view_identity))))));
comment on policy "Select by authenticated" on journal.status_history is $c$Merged from: Authors read their own status history; Desk editors read named status history; Submissions Managers read status history$c$;

-- journal.submission_files
drop policy "Authors read their own files" on journal.submission_files;
drop policy "Desk editors read named submission files" on journal.submission_files;
drop policy "Submissions Managers read files" on journal.submission_files;
create policy "Select by authenticated" on journal.submission_files
  as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = submission_files.submission_id) AND (s.author_id = ( SELECT auth.uid() AS uid)))))) or ((EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = submission_files.submission_id) AND (s.call_id IS NULL) AND ( SELECT private.is_desk_editor(s.desk) AS is_desk_editor))))) or ((EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE ((s.id = submission_files.submission_id) AND ( SELECT private.can_view_identity(private.call_issue(s.call_id)) AS can_view_identity))))));
comment on policy "Select by authenticated" on journal.submission_files is $c$Merged from: Authors read their own files; Desk editors read named submission files; Submissions Managers read files$c$;

-- journal.submissions
drop policy "Authors read their own submissions" on journal.submissions;
drop policy "Desk editors read named submissions" on journal.submissions;
drop policy "Submissions Managers read submissions for their issue" on journal.submissions;
create policy "Select by authenticated" on journal.submissions
  as permissive for select to authenticated
  using (((author_id = ( SELECT auth.uid() AS uid))) or (((call_id IS NULL) AND ( SELECT private.is_desk_editor(submissions.desk) AS is_desk_editor))) or (( SELECT private.can_view_identity(private.call_issue(submissions.call_id)) AS can_view_identity)));
comment on policy "Select by authenticated" on journal.submissions is $c$Merged from: Authors read their own submissions; Desk editors read named submissions; Submissions Managers read submissions for their issue$c$;

-- membership.activity_records
drop policy "Member managers read activity records" on membership.activity_records;
drop policy "Users read their own activity records" on membership.activity_records;
create policy "Select by authenticated" on membership.activity_records
  as permissive for select to authenticated
  using ((( SELECT private.has_permission('members.manage'::text) AS has_permission)) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on membership.activity_records is $c$Merged from: Member managers read activity records; Users read their own activity records$c$;

-- membership.memberships
drop policy "Member managers read memberships" on membership.memberships;
drop policy "Members read the membership roll" on membership.memberships;
drop policy "Users read their own membership" on membership.memberships;
create policy "Select by authenticated" on membership.memberships
  as permissive for select to authenticated
  using ((( SELECT private.has_permission('members.manage'::text) AS has_permission)) or (( SELECT private.membership_is_member() AS is_member)) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on membership.memberships is $c$Merged from: Member managers read memberships; Members read the membership roll; Users read their own membership$c$;

-- membership.pledges
drop policy "Member managers read pledges" on membership.pledges;
drop policy "Users read their own pledges" on membership.pledges;
create policy "Select by authenticated" on membership.pledges
  as permissive for select to authenticated
  using ((( SELECT private.has_permission('members.manage'::text) AS has_permission)) or ((user_id = ( SELECT auth.uid() AS uid))));
comment on policy "Select by authenticated" on membership.pledges is $c$Merged from: Member managers read pledges; Users read their own pledges$c$;

-- membership.verification_requests
drop policy "Users read their own verification requests" on membership.verification_requests;
drop policy "Verifiers read the verification queue" on membership.verification_requests;
create policy "Select by authenticated" on membership.verification_requests
  as permissive for select to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid))) or (( SELECT private.has_permission('members.verify'::text) AS has_permission)));
comment on policy "Select by authenticated" on membership.verification_requests is $c$Merged from: Users read their own verification requests; Verifiers read the verification queue$c$;

-- programmes.auditions
drop policy "Leads schedule auditions" on programmes.auditions;
drop policy "Members read open auditions" on programmes.auditions;
create policy "Select by authenticated" on programmes.auditions
  as permissive for select to authenticated
  using ((( SELECT private.may_manage_production(auditions.production_id) AS may_manage_production)) or ((( SELECT private.may_manage_production(auditions.production_id) AS may_manage_production) OR (( SELECT private.membership_is_member() AS is_member) AND ( SELECT private.is_auditioning(auditions.production_id) AS is_auditioning)))));
comment on policy "Select by authenticated" on programmes.auditions is $c$Merged from: Leads schedule auditions; Members read open auditions$c$;
create policy "Leads schedule auditions (insert)" on programmes.auditions
  as permissive for insert to authenticated
  with check (( SELECT private.may_manage_production(auditions.production_id) AS may_manage_production));
create policy "Leads schedule auditions (update)" on programmes.auditions
  as permissive for update to authenticated
  using (( SELECT private.may_manage_production(auditions.production_id) AS may_manage_production))
  with check (( SELECT private.may_manage_production(auditions.production_id) AS may_manage_production));
create policy "Leads schedule auditions (delete)" on programmes.auditions
  as permissive for delete to authenticated
  using (( SELECT private.may_manage_production(auditions.production_id) AS may_manage_production));

-- programmes.episodes
drop policy "Anyone reads published episodes" on programmes.episodes;
drop policy "Programme managers manage episodes" on programmes.episodes;
create policy "Anyone reads published episodes" on programmes.episodes
  as permissive for select to anon
  using (((published_at IS NOT NULL) AND (published_at <= now())));
create policy "Select by authenticated" on programmes.episodes
  as permissive for select to authenticated
  using ((((published_at IS NOT NULL) AND (published_at <= now()))) or (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, episodes.programme_id) AS has_permission)));
comment on policy "Select by authenticated" on programmes.episodes is $c$Merged from: Anyone reads published episodes; Programme managers manage episodes$c$;
create policy "Programme managers manage episodes (insert)" on programmes.episodes
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, episodes.programme_id) AS has_permission));
create policy "Programme managers manage episodes (update)" on programmes.episodes
  as permissive for update to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, episodes.programme_id) AS has_permission))
  with check (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, episodes.programme_id) AS has_permission));
create policy "Programme managers manage episodes (delete)" on programmes.episodes
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, episodes.programme_id) AS has_permission));

-- programmes.production_credits
drop policy "Leads keep credits" on programmes.production_credits;
drop policy "The company reads its credits" on programmes.production_credits;
create policy "Select by authenticated" on programmes.production_credits
  as permissive for select to authenticated
  using ((( SELECT private.may_manage_production(production_credits.production_id) AS may_manage_production)) or (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.may_manage_production(production_credits.production_id) AS may_manage_production) OR ( SELECT private.is_credited(production_credits.production_id) AS is_credited))));
comment on policy "Select by authenticated" on programmes.production_credits is $c$Merged from: Leads keep credits; The company reads its credits$c$;
create policy "Leads keep credits (insert)" on programmes.production_credits
  as permissive for insert to authenticated
  with check (( SELECT private.may_manage_production(production_credits.production_id) AS may_manage_production));
create policy "Leads keep credits (update)" on programmes.production_credits
  as permissive for update to authenticated
  using (( SELECT private.may_manage_production(production_credits.production_id) AS may_manage_production))
  with check (( SELECT private.may_manage_production(production_credits.production_id) AS may_manage_production));
create policy "Leads keep credits (delete)" on programmes.production_credits
  as permissive for delete to authenticated
  using (( SELECT private.may_manage_production(production_credits.production_id) AS may_manage_production));

-- programmes.production_events
drop policy "Leads link performances" on programmes.production_events;
drop policy "The company reads its performances" on programmes.production_events;
create policy "Select by authenticated" on programmes.production_events
  as permissive for select to authenticated
  using ((( SELECT private.may_manage_production(production_events.production_id) AS may_manage_production)) or ((( SELECT private.may_manage_production(production_events.production_id) AS may_manage_production) OR ( SELECT private.is_credited(production_events.production_id) AS is_credited))));
comment on policy "Select by authenticated" on programmes.production_events is $c$Merged from: Leads link performances; The company reads its performances$c$;
create policy "Leads link performances (insert)" on programmes.production_events
  as permissive for insert to authenticated
  with check (( SELECT private.may_manage_production(production_events.production_id) AS may_manage_production));
create policy "Leads link performances (update)" on programmes.production_events
  as permissive for update to authenticated
  using (( SELECT private.may_manage_production(production_events.production_id) AS may_manage_production))
  with check (( SELECT private.may_manage_production(production_events.production_id) AS may_manage_production));
create policy "Leads link performances (delete)" on programmes.production_events
  as permissive for delete to authenticated
  using (( SELECT private.may_manage_production(production_events.production_id) AS may_manage_production));

-- programmes.production_partners
drop policy "Leads name partners" on programmes.production_partners;
drop policy "The company reads its partners" on programmes.production_partners;
create policy "Select by authenticated" on programmes.production_partners
  as permissive for select to authenticated
  using ((( SELECT private.may_manage_production(production_partners.production_id) AS may_manage_production)) or ((( SELECT private.may_manage_production(production_partners.production_id) AS may_manage_production) OR ( SELECT private.is_credited(production_partners.production_id) AS is_credited))));
comment on policy "Select by authenticated" on programmes.production_partners is $c$Merged from: Leads name partners; The company reads its partners$c$;
create policy "Leads name partners (insert)" on programmes.production_partners
  as permissive for insert to authenticated
  with check (( SELECT private.may_manage_production(production_partners.production_id) AS may_manage_production));
create policy "Leads name partners (update)" on programmes.production_partners
  as permissive for update to authenticated
  using (( SELECT private.may_manage_production(production_partners.production_id) AS may_manage_production))
  with check (( SELECT private.may_manage_production(production_partners.production_id) AS may_manage_production));
create policy "Leads name partners (delete)" on programmes.production_partners
  as permissive for delete to authenticated
  using (( SELECT private.may_manage_production(production_partners.production_id) AS may_manage_production));

-- programmes.reels
drop policy "Anyone reads published reels" on programmes.reels;
drop policy "Programme managers manage reels" on programmes.reels;
create policy "Anyone reads published reels" on programmes.reels
  as permissive for select to anon
  using (((published_at IS NOT NULL) AND (published_at <= now())));
create policy "Select by authenticated" on programmes.reels
  as permissive for select to authenticated
  using ((((published_at IS NOT NULL) AND (published_at <= now()))) or (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, reels.programme_id) AS has_permission)));
comment on policy "Select by authenticated" on programmes.reels is $c$Merged from: Anyone reads published reels; Programme managers manage reels$c$;
create policy "Programme managers manage reels (insert)" on programmes.reels
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, reels.programme_id) AS has_permission));
create policy "Programme managers manage reels (update)" on programmes.reels
  as permissive for update to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, reels.programme_id) AS has_permission))
  with check (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, reels.programme_id) AS has_permission));
create policy "Programme managers manage reels (delete)" on programmes.reels
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, reels.programme_id) AS has_permission));

-- programmes.rehearsals
drop policy "Leads call rehearsals" on programmes.rehearsals;
drop policy "The company reads its rehearsals" on programmes.rehearsals;
create policy "Select by authenticated" on programmes.rehearsals
  as permissive for select to authenticated
  using ((( SELECT private.may_manage_production(rehearsals.production_id) AS may_manage_production)) or ((( SELECT private.may_manage_production(rehearsals.production_id) AS may_manage_production) OR ( SELECT private.is_credited(rehearsals.production_id) AS is_credited))));
comment on policy "Select by authenticated" on programmes.rehearsals is $c$Merged from: Leads call rehearsals; The company reads its rehearsals$c$;
create policy "Leads call rehearsals (insert)" on programmes.rehearsals
  as permissive for insert to authenticated
  with check (( SELECT private.may_manage_production(rehearsals.production_id) AS may_manage_production));
create policy "Leads call rehearsals (update)" on programmes.rehearsals
  as permissive for update to authenticated
  using (( SELECT private.may_manage_production(rehearsals.production_id) AS may_manage_production))
  with check (( SELECT private.may_manage_production(rehearsals.production_id) AS may_manage_production));
create policy "Leads call rehearsals (delete)" on programmes.rehearsals
  as permissive for delete to authenticated
  using (( SELECT private.may_manage_production(rehearsals.production_id) AS may_manage_production));

-- programmes.rotas
drop policy "Members read rotas" on programmes.rotas;
drop policy "Programme managers manage rotas" on programmes.rotas;
create policy "Select by authenticated" on programmes.rotas
  as permissive for select to authenticated
  using ((( SELECT private.membership_is_member() AS is_member)) or (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, rotas.programme_id) AS has_permission)));
comment on policy "Select by authenticated" on programmes.rotas is $c$Merged from: Members read rotas; Programme managers manage rotas$c$;
create policy "Programme managers manage rotas (insert)" on programmes.rotas
  as permissive for insert to authenticated
  with check (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, rotas.programme_id) AS has_permission));
create policy "Programme managers manage rotas (update)" on programmes.rotas
  as permissive for update to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, rotas.programme_id) AS has_permission))
  with check (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, rotas.programme_id) AS has_permission));
create policy "Programme managers manage rotas (delete)" on programmes.rotas
  as permissive for delete to authenticated
  using (( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, rotas.programme_id) AS has_permission));

-- programmes.shift_signups
drop policy "Members confirm, swap or cancel their own shifts" on programmes.shift_signups;
drop policy "Members read their own sign-ups" on programmes.shift_signups;
drop policy "Programme managers read sign-ups" on programmes.shift_signups;
drop policy "Programme managers update sign-ups" on programmes.shift_signups;
create policy "Select by authenticated" on programmes.shift_signups
  as permissive for select to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid))) or ((EXISTS ( SELECT 1
   FROM (programmes.shifts s
     JOIN programmes.rotas r ON ((r.id = s.rota_id)))
  WHERE ((s.id = shift_signups.shift_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission))))));
comment on policy "Select by authenticated" on programmes.shift_signups is $c$Merged from: Members read their own sign-ups; Programme managers read sign-ups$c$;
create policy "Update by authenticated" on programmes.shift_signups
  as permissive for update to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid))) or ((EXISTS ( SELECT 1
   FROM (programmes.shifts s
     JOIN programmes.rotas r ON ((r.id = s.rota_id)))
  WHERE ((s.id = shift_signups.shift_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission))))))
  with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['confirmed'::text, 'swap_requested'::text, 'cancelled'::text])))) or ((EXISTS ( SELECT 1
   FROM (programmes.shifts s
     JOIN programmes.rotas r ON ((r.id = s.rota_id)))
  WHERE ((s.id = shift_signups.shift_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission))))));
comment on policy "Update by authenticated" on programmes.shift_signups is $c$Merged from: Members confirm, swap or cancel their own shifts; Programme managers update sign-ups$c$;

-- programmes.shifts
drop policy "Members read shifts" on programmes.shifts;
drop policy "Programme managers manage shifts" on programmes.shifts;
create policy "Select by authenticated" on programmes.shifts
  as permissive for select to authenticated
  using ((( SELECT private.membership_is_member() AS is_member)) or ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission))))));
comment on policy "Select by authenticated" on programmes.shifts is $c$Merged from: Members read shifts; Programme managers manage shifts$c$;
create policy "Programme managers manage shifts (insert)" on programmes.shifts
  as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission)))));
create policy "Programme managers manage shifts (update)" on programmes.shifts
  as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission)))))
  with check ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission)))));
create policy "Programme managers manage shifts (delete)" on programmes.shifts
  as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.has_permission('programmes.manage'::text, 'programme'::text, r.programme_id) AS has_permission)))));

-- programmes.six_words
drop policy "Anyone reads approved six words" on programmes.six_words;
drop policy "Members read their own six words" on programmes.six_words;
drop policy "Moderators read every entry" on programmes.six_words;
create policy "Anyone reads approved six words" on programmes.six_words
  as permissive for select to anon
  using ((status = 'approved'::text));
create policy "Select by authenticated" on programmes.six_words
  as permissive for select to authenticated
  using (((status = 'approved'::text)) or ((user_id = ( SELECT auth.uid() AS uid))) or (( SELECT private.has_permission_anywhere('programmes.manage'::text) AS has_permission_anywhere)));
comment on policy "Select by authenticated" on programmes.six_words is $c$Merged from: Anyone reads approved six words; Members read their own six words; Moderators read every entry$c$;

-- storage.objects
drop policy "Authors remove files from their own submissions in intake" on storage.objects;
drop policy "Authors upload files to their own submissions" on storage.objects;
drop policy "Charity managers upload receipts" on storage.objects;
drop policy "Governance managers upload library documents" on storage.objects;
drop policy "Partnership managers read partner logos" on storage.objects;
drop policy "Partnership managers remove partner logos" on storage.objects;
drop policy "Partnership managers upload ad images" on storage.objects;
drop policy "Partnership managers upload partner logos" on storage.objects;
drop policy "Partnership officers upload signed memoranda" on storage.objects;
drop policy "Piece editors remove Waraq media" on storage.objects;
drop policy "Piece editors upload Waraq media" on storage.objects;
drop policy "Production managers read posters" on storage.objects;
drop policy "Production managers read rights documents" on storage.objects;
drop policy "Production managers remove posters" on storage.objects;
drop policy "Production managers upload posters" on storage.objects;
drop policy "Production managers upload rights documents" on storage.objects;
drop policy "Publishers read media objects" on storage.objects;
drop policy "Publishers replace and remove media" on storage.objects;
drop policy "Publishers upload media" on storage.objects;
drop policy "Users read their own avatar objects" on storage.objects;
drop policy "Users remove their own avatar" on storage.objects;
drop policy "Users upload their own avatar" on storage.objects;
create policy "Select by authenticated" on storage.objects
  as permissive for select to authenticated
  using ((((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'partners'::text) AND ( SELECT private.has_permission('partners.manage'::text) AS has_permission))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'productions'::text) AND ( SELECT private.has_permission_anywhere('productions.manage'::text) AS has_permission_anywhere))) or (((bucket_id = 'library'::text) AND ((storage.foldername(name))[1] = 'productions'::text) AND ( SELECT private.has_permission_anywhere('productions.manage'::text) AS has_permission_anywhere))) or (((bucket_id = 'media'::text) AND (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere)))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text))));
comment on policy "Select by authenticated" on storage.objects is $c$Merged from: Partnership managers read partner logos; Production managers read posters; Production managers read rights documents; Publishers read media objects; Users read their own avatar objects$c$;
create policy "Insert by authenticated" on storage.objects
  as permissive for insert to authenticated
  with check ((((bucket_id = 'submissions'::text) AND (EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.author_id = ( SELECT auth.uid() AS uid)) AND ((s.status = 'received'::journal.submission_status) OR ((s.status = 'intake_check'::journal.submission_status) AND (s.intake_returned_at IS NOT NULL)))))))) or (((bucket_id = 'receipts'::text) AND ( SELECT private.has_permission('charity.manage'::text, 'campaign'::text, ((storage.foldername(objects.name))[1])::uuid) AS has_permission))) or (((bucket_id = 'library'::text) AND ( SELECT private.has_permission('governance.manage'::text) AS has_permission))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'ads'::text) AND ( SELECT private.has_permission('partners.manage'::text) AS has_permission))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'partners'::text) AND ( SELECT private.has_permission('partners.manage'::text) AS has_permission))) or (((bucket_id = 'library'::text) AND ((storage.foldername(name))[1] = 'partners'::text) AND (( SELECT private.has_permission('partners.manage'::text) AS has_permission) OR ( SELECT private.has_permission('partners.sign'::text) AS has_permission)))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'waraq'::text) AND ( SELECT private.piece_editor(((storage.foldername(objects.name))[2])::uuid) AS piece_editor))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'productions'::text) AND ( SELECT private.has_permission_anywhere('productions.manage'::text) AS has_permission_anywhere))) or (((bucket_id = 'library'::text) AND ((storage.foldername(name))[1] = 'productions'::text) AND ( SELECT private.has_permission_anywhere('productions.manage'::text) AS has_permission_anywhere))) or (((bucket_id = 'media'::text) AND (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('programmes.manage'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('events.manage'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('charity.manage'::text) AS has_permission_anywhere)))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text))));
comment on policy "Insert by authenticated" on storage.objects is $c$Merged from: Authors upload files to their own submissions; Charity managers upload receipts; Governance managers upload library documents; Partnership managers upload ad images; Partnership managers upload partner logos; Partnership officers upload signed memoranda; Piece editors upload Waraq media; Production managers upload posters; Production managers upload rights documents; Publishers upload media; Users upload their own avatar$c$;
create policy "Delete by authenticated" on storage.objects
  as permissive for delete to authenticated
  using ((((bucket_id = 'submissions'::text) AND (EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.author_id = ( SELECT auth.uid() AS uid)) AND ((s.status = 'received'::journal.submission_status) OR ((s.status = 'intake_check'::journal.submission_status) AND (s.intake_returned_at IS NOT NULL)))))))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'partners'::text) AND ( SELECT private.has_permission('partners.manage'::text) AS has_permission))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'waraq'::text) AND ( SELECT private.piece_editor(((storage.foldername(objects.name))[2])::uuid) AS piece_editor))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'productions'::text) AND ( SELECT private.has_permission_anywhere('productions.manage'::text) AS has_permission_anywhere))) or (((bucket_id = 'media'::text) AND (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere)))) or (((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text))));
comment on policy "Delete by authenticated" on storage.objects is $c$Merged from: Authors remove files from their own submissions in intake; Partnership managers remove partner logos; Piece editors remove Waraq media; Production managers remove posters; Publishers replace and remove media; Users remove their own avatar$c$;

