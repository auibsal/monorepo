-- The register holds only what people sign (decisions.md, Documents and
-- forms: "Names, not numbers"): the 13 agreements and consents, plus the
-- three kinds sent on the same form page (a concern, an event pitch, a
-- members' meeting motion). The 27 retired kinds (letters, notices,
-- minutes, score sheets, reports, lists, checklists and the Code of
-- Conduct, accepted at sign-up) leave it; nothing was ever filed under
-- them. Their old F-numbers still resolve through the code's one-time
-- table (`legacyNumbers` in apps/web/lib/data/form-paths.ts), and those
-- still used as templates stay in the templates index.

-- The incident report is a record (events.incident_reports), not a kind.
create or replace function private.purge_incident_records()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from events.incident_reports
  where closed_at is not null
    and closed_at < now() - case when qalam then interval '7 years' else interval '2 years' end;
  get diagnostics n = row_count;
  return n;
end;
$$;

delete from governance.form_links
where form_key not in (
  'role-agreement', 'conflict-of-interest-declaration', 'confidentiality-agreement',
  'handover', 'media-release', 'partnership-memorandum', 'company-agreement',
  'publication-agreement', 'trip-consent', 'parent-consent', 'qalam-mentor-agreement',
  'qalam-parent-consent', 'qalam-publishing-consent',
  'concern', 'event-pitch', 'members-meeting-motion'
);
delete from governance.form_types
where key not in (
  'role-agreement', 'conflict-of-interest-declaration', 'confidentiality-agreement',
  'handover', 'media-release', 'partnership-memorandum', 'company-agreement',
  'publication-agreement', 'trip-consent', 'parent-consent', 'qalam-mentor-agreement',
  'qalam-parent-consent', 'qalam-publishing-consent',
  'concern', 'event-pitch', 'members-meeting-motion'
);
