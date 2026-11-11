-- One account model (decisions.md, Members): a class says whether someone
-- is a member, a role says what they do. The Parent and Qalam account types
-- are roles on a guest's account; Student Life is an outside role on an
-- Associate's account. No role grants anything by itself here: what each
-- one opens is decided by the flows that use it.

-- A role scoped to one person: a parent's role is linked to their child.
alter table access.role_assignments drop constraint role_assignments_scope_type_check;
alter table access.role_assignments add constraint role_assignments_scope_type_check
  check (scope_type in ('global', 'programme', 'event', 'issue', 'production', 'partner', 'episode', 'member'));

insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('parent', 'Parent', 'وليّ الأمر', false, 70),
  ('qalam_student', 'Qalam student', 'طالب «قلم»', false, 71),
  ('student_life', 'Student Life', 'شؤون الطلبة', false, 72)
on conflict (key) do nothing;

update access.roles r
set kind = 'outside', name_ar_feminine = v.f, description = v.d
from (values
  ('parent', 'وليّة الأمر',
   'A guest linked to their child under 18 (scope: member): sees and withdraws the child''s consents; ends at 18 or when Qalam ends.'),
  ('qalam_student', 'طالبة «قلم»',
   'A guest under 18 in Qalam, with a parent''s consent; ends with the run. The minors'' protections hold until 18.'),
  ('student_life', 'شؤون الطلبة',
   'AUIB''s Office of Student Life, on an Associate''s account: answers requests, approves trips and sees Security''s guest lists.')
) as v(key, f, d)
where r.key = v.key;
