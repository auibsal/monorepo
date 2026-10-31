-- The experience audit (owner, Oct 31, 2026, last):
--
-- 1. The Qirtas Awards were "the Prizes" until Oct 31: the open masthead
--    seat is the Awards Coordinator. Voices is «آراء» in Arabic (Oct 30),
--    so its editor is «محرّر آراء».
-- 2. A memorandum is signed on both sides by name: the Society's side now
--    keeps the signer's names as the partner's side does, so the partner's
--    dashboard can show both signatures (the partner's team can't read the
--    President's profile).

-- ── 1. Names ────────────────────────────────────────────────────────────────
-- The seat is a role on the platform like every role the documents name
-- (Oct 31, 2026): it runs the Awards (journal.prizes) and the Editor hires.
insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('awards_coordinator', 'Awards Coordinator', 'منسق جوائز قرطاس', false, 129);
update access.roles set hiring_owner = 'qirtas' where key = 'awards_coordinator';
insert into access.role_permissions (role, permission) values
  ('awards_coordinator', 'journal.prizes'),
  ('awards_coordinator', 'library.read');

update programmes.openings
set title_en = 'Awards Coordinator', title_ar = 'منسق جوائز قرطاس',
  role = 'awards_coordinator'
where title_en = 'Prizes Coordinator';

update programmes.openings
set title_ar = 'محرّر آراء'
where title_en = 'Voices Editor' and title_ar = 'محرر الأصوات';

update access.roles
set name_ar = 'محرّر آراء'
where key = 'voices_editor' and name_ar = 'محرر الأصوات';

-- ── 2. The Society's signature on a memorandum ─────────────────────────────
alter table governance.partner_agreements add column society_signatory text
  check (char_length(society_signatory) <= 200);

create function private.society_signs_by_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.signed_by is not null
    and new.signed_by is distinct from old.signed_by then
    select concat_ws(' · ', nullif(p.full_name_en, ''), nullif(p.full_name_ar, ''))
      into new.society_signatory
    from core.profiles p where p.id = new.signed_by;
  elsif new.signed_by is null then
    new.society_signatory := null;
  end if;
  return new;
end;
$$;
revoke all on function private.society_signs_by_name() from public, anon, authenticated;

create trigger society_signs_by_name
  before update of signed_by on governance.partner_agreements
  for each row execute function private.society_signs_by_name();

update governance.partner_agreements a
set society_signatory = concat_ws(' · ', nullif(p.full_name_en, ''), nullif(p.full_name_ar, ''))
from core.profiles p
where p.id = a.signed_by and a.society_signatory is null;
