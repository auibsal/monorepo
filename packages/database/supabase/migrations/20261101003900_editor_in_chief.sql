-- The Editor-in-Chief (owner, Nov 5, 2026). "Editor of Qirtas" is retired:
-- the paper's head is the Editor-in-Chief, a seat on the Council, and
-- Mohammed-Ali Ohmaid holds it. Council seats ask for two-step sign-in, as
-- every director's does.

update access.roles
set is_council = true,
    requires_mfa = true
where key = 'eic';

-- The Editor of Qirtas's seat (a director titled so) ends today; the
-- record of having held it stays.
update access.role_assignments
set ends_at = now(),
    note = concat_ws(' ', note, 'Ended Nov 5, 2026: the seat is the Editor-in-Chief''s.')
where role = 'director'
  and title_en = 'Editor of Qirtas'
  and (ends_at is null or ends_at > now());

-- Mohammed-Ali Ohmaid is the Editor-in-Chief, across the whole paper. By
-- account, so nothing changes where the account does not exist.
insert into access.role_assignments (user_id, role, scope_type, note)
select p.id, 'eic', 'global', 'The Editor-in-Chief, on the Council (owner, Nov 5, 2026).'
from core.profiles p
where p.id = '9fbe017b-1330-4bfa-bc42-fb0941e2330c'
  and not exists (
    select 1 from access.role_assignments a
    where a.user_id = p.id and a.role = 'eic' and a.scope_type = 'global'
      and (a.ends_at is null or a.ends_at > now())
  );
