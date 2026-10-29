-- Hiring (owner, Oct 30, 2026). The Callboard lists every role the Society
-- is filling. Membership (members.manage) runs it: posts the role, takes
-- the applications in the Diwan, schedules the conversations, makes the
-- offer and does the onboarding, and the hours are logged as shifts. The
-- owner of each role picks the person: the Editor picks the masthead, the
-- Director of Programs picks the Program Leads (and each program its own
-- team), each director their team. The Council confirms directors and the
-- members elect officers, outside the Callboard.
--
-- An opening names its owner; a reply ("I'm interested") moves through
-- new → talking (Membership schedules) → picked or not picked (the owner)
-- → offered → onboarded (Membership), or withdrawn.

-- ── Who owns an opening ─────────────────────────────────────────────────────

alter table programmes.openings
  add column owner text not null default 'program'
    check (owner in ('program', 'qirtas', 'media', 'partnerships', 'membership', 'council'));

comment on column programmes.openings.owner is
  'Who picks the person: program (the program''s managers, or the Director of Programs), qirtas (the Editor), media, partnerships, membership (each director) or council.';

-- Whoever picks for an opening with this owner and program.
create function private.picks_opening(owner text, programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case picks_opening.owner
    when 'program' then private.manages_opening(picks_opening.programme_id)
    when 'qirtas' then private.has_permission('journal.manage')
    when 'media' then private.has_permission('content.manage')
    when 'partnerships' then private.has_permission('partners.manage')
    when 'membership' then private.has_permission('members.manage')
    when 'council' then private.has_permission('governance.manage')
    else false
  end;
$$;

-- Membership runs every opening; the owner runs their own.
create function private.handles_opening(owner text, programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('members.manage')
    or private.picks_opening(handles_opening.owner, handles_opening.programme_id);
$$;

create function private.handles_opening_id(opening_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from programmes.openings o
    where o.id = handles_opening_id.opening_id and private.handles_opening(o.owner, o.programme_id)
  );
$$;

revoke all on function private.picks_opening(text, uuid), private.handles_opening(text, uuid),
  private.handles_opening_id(uuid) from public, anon;
grant execute on function private.picks_opening(text, uuid), private.handles_opening(text, uuid),
  private.handles_opening_id(uuid) to authenticated, service_role;

drop policy "Select by authenticated" on programmes.openings;
drop policy "Program managers post openings" on programmes.openings;
drop policy "Program managers edit openings" on programmes.openings;
drop policy "Program managers remove openings" on programmes.openings;

create policy "Select by authenticated" on programmes.openings
  for select to authenticated
  using (
    (is_open and (closes_at is null or closes_at > now()) and (select private.membership_is_member()))
    or (select private.handles_opening(owner, programme_id))
  );
create policy "Membership and the owner post openings" on programmes.openings
  for insert to authenticated
  with check ((select private.handles_opening(owner, programme_id)));
create policy "Membership and the owner edit openings" on programmes.openings
  for update to authenticated
  using ((select private.handles_opening(owner, programme_id)))
  with check ((select private.handles_opening(owner, programme_id)));
create policy "Membership and the owner remove openings" on programmes.openings
  for delete to authenticated
  using ((select private.handles_opening(owner, programme_id)));

-- ── Applications ────────────────────────────────────────────────────────────

alter table programmes.opening_replies
  add column status text not null default 'new'
    check (status in ('new', 'talking', 'picked', 'not_picked', 'offered', 'onboarded', 'withdrawn')),
  add column talk_at timestamptz,
  add column picked_by uuid references auth.users (id) on delete set null,
  add column picked_at timestamptz,
  add column updated_at timestamptz not null default now();

comment on column programmes.opening_replies.status is
  'new, talking (Membership has scheduled a conversation, talk_at), picked or not_picked (the owner), offered and onboarded (Membership), withdrawn.';

create index opening_replies_picked_by_idx on programmes.opening_replies (picked_by);

create trigger set_updated_at before update on programmes.opening_replies
  for each row execute function private.set_updated_at();

-- The owner picks; Membership does the rest. Nobody moves their own.
create function private.opening_reply_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o programmes.openings;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.opening_id <> old.opening_id or new.user_id <> old.user_id then
    raise exception 'reply_fixed' using errcode = '42501';
  end if;
  if new.user_id = (select auth.uid()) then
    raise exception 'not_your_own' using errcode = '42501';
  end if;
  select * into o from programmes.openings where id = new.opening_id;
  if new.status in ('picked', 'not_picked') and new.status is distinct from old.status then
    if not private.picks_opening(o.owner, o.programme_id) then
      raise exception 'the_owner_picks' using errcode = '42501';
    end if;
    new.picked_by := (select auth.uid());
    new.picked_at := now();
  elsif new.status is distinct from old.status or new.talk_at is distinct from old.talk_at then
    if not private.has_permission('members.manage') then
      raise exception 'membership_runs_hiring' using errcode = '42501';
    end if;
    if new.status in ('offered', 'onboarded') and old.status not in ('picked', 'offered') then
      raise exception 'pick_first' using errcode = '22023';
    end if;
  end if;
  if new.status not in ('picked', 'not_picked') then
    new.picked_by := old.picked_by;
    new.picked_at := old.picked_at;
  end if;
  return new;
end;
$$;

create trigger opening_reply_guard before update on programmes.opening_replies
  for each row execute function private.opening_reply_guard();

revoke all on function private.opening_reply_guard() from public, anon, authenticated;

drop policy "Select by authenticated" on programmes.opening_replies;

create policy "Select by authenticated" on programmes.opening_replies
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.handles_opening_id(opening_id)));
create policy "Membership and the owner move applications" on programmes.opening_replies
  for update to authenticated
  using ((select private.handles_opening_id(opening_id)))
  with check ((select private.handles_opening_id(opening_id)));

grant update (status, talk_at) on programmes.opening_replies to authenticated;

create trigger log_activity after insert or update or delete on programmes.opening_replies
  for each row execute function private.log_activity();

-- ── The open masthead seats, Oct 30, 2026 ───────────────────────────────────

-- On Qirtas's own program row; the Editor picks.
insert into programmes.openings (programme_id, owner, kind, desk, title_en, title_ar)
select p.id, 'qirtas', 'role', null, seat.title_en, seat.title_ar
from core.programmes p
cross join (values
  ('News Editor', 'محرر الأخبار'),
  ('Voices Editor', 'محرر الأصوات'),
  ('Video Editor', 'محرر المرئيات'),
  ('Games Editor', 'محرر الألعاب'),
  ('Producer, Next Stop', 'منتج «المحطة القادمة»'),
  ('Prizes Coordinator', 'منسق جوائز قرطاس')
) as seat (title_en, title_ar)
where p.slug = 'waraq';
