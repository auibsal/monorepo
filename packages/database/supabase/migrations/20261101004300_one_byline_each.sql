-- One own-name byline for each person, always in their current name
-- (owner, Nov 5, 2026: "Mohammed Ali Ehsan" stayed in Qirtas after his
-- name changed).
--
-- Why it stayed: bylines followed a profile's names only when an update
-- named full_name_en or full_name_ar itself. Those columns are kept from
-- the four parts by a trigger, so a change made to the parts (as migration
-- 20261101002200 did) never reached the byline. The trigger now fires on
-- any update that changes a shown name.
--
-- Then, for every account: its own-name bylines (not pen names) become
-- one, the oldest, which takes the others' pieces and credits; and every
-- own-name byline takes its account's current names (and with them its
-- address, /qirtas/authors/<first-last>).

drop trigger names_to_bylines on core.profiles;
create trigger names_to_bylines after update on core.profiles
  for each row
  when (old.full_name_en is distinct from new.full_name_en
    or old.full_name_ar is distinct from new.full_name_ar)
  execute function private.profile_names_to_bylines();

-- A new byline on an old piece is not an edit: approvals stay.
alter table journal.pieces disable trigger after_piece_content_change;

do $$
declare
  r record;
begin
  for r in
    select user_id, (array_agg(id order by created_at, id))[1] as keep,
      (array_agg(id order by created_at, id))[2:] as others
    from journal.contributors
    where user_id is not null and not is_pen_name
    group by user_id
    having count(*) > 1
  loop
    update journal.pieces set contributor_id = r.keep
    where contributor_id = any (r.others);
    insert into journal.piece_credits (piece_id, contributor_id, role)
    select piece_id, r.keep, role from journal.piece_credits
    where contributor_id = any (r.others)
    on conflict do nothing;
    delete from journal.contributors where id = any (r.others);
  end loop;
end;
$$;

alter table journal.pieces enable trigger after_piece_content_change;

update journal.contributors c
set name_en = p.full_name_en,
    name_ar = coalesce(p.full_name_ar, c.name_ar)
from core.profiles p
where p.id = c.user_id
  and not c.is_pen_name
  and nullif(btrim(p.full_name_en), '') is not null
  and (c.name_en is distinct from p.full_name_en or c.name_ar is distinct from coalesce(p.full_name_ar, c.name_ar));
