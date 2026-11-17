-- The newsroom (decisions.md, Qirtas: "The assignment desk", "Credits are
-- never typed", "Reading copies").
--
-- An editor makes an assignment, or a writer pitches one: its slug,
-- section, angle, due date and assignee, for writing, photos or art. The
-- assignee accepts it from Today; it becomes the piece when writing
-- starts. Each section has one board: Pitched, Assigned, Drafting,
-- Editing, Copy, Ready, Published.
--
-- Co-writers are picked from the site's people and accept the credit;
-- editors, copy editors and fact-checkers are credited by the work they do
-- (the approvals and the fact check), never typed. Every view of work
-- under review is logged.

create table journal.story_assignments (
  id uuid primary key default gen_random_uuid(),
  desk journal.desk not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  angle text not null check (char_length(angle) between 1 and 1000),
  kind text not null default 'writing' check (kind in ('writing', 'photos', 'art')),
  due_on date,
  assignee_id uuid references auth.users (id) on delete set null,
  status text not null default 'assigned'
    check (status in ('pitched', 'assigned', 'accepted', 'declined', 'drafting', 'withdrawn')),
  piece_id uuid references journal.pieces (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now()
);
create index story_assignments_desk_idx on journal.story_assignments (desk, status);
create index story_assignments_assignee_id_idx on journal.story_assignments (assignee_id);
create index story_assignments_piece_id_idx on journal.story_assignments (piece_id);
create index story_assignments_created_by_idx on journal.story_assignments (created_by);

alter table journal.story_assignments enable row level security;
create policy "No third-party apps" on journal.story_assignments
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
-- The section's editors and the assignee read it.
create policy "The desk and the assignee read assignments" on journal.story_assignments
  for select to authenticated
  using (
    assignee_id = (select auth.uid())
    or created_by = (select auth.uid())
    or private.is_desk_editor(desk)
  );
-- An editor assigns; anyone on the staff pitches to themselves.
create policy "Editors assign and staff pitch" on journal.story_assignments
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      private.is_desk_editor(desk)
      or (status = 'pitched' and assignee_id = (select auth.uid()) and (select private.i_am_staff()))
    )
  );
create policy "The desk and the assignee move assignments" on journal.story_assignments
  for update to authenticated
  using (assignee_id = (select auth.uid()) or private.is_desk_editor(desk))
  with check (assignee_id = (select auth.uid()) or private.is_desk_editor(desk));
grant select, insert, update (angle, kind, due_on, assignee_id, status, accepted_at, updated_at, slug)
  on journal.story_assignments to authenticated;
grant all on journal.story_assignments to service_role;

create trigger log_activity
  after insert or update or delete on journal.story_assignments
  for each row execute function private.log_activity();

-- Writing starts: the piece is made under the assignee's byline, in the
-- assignment's section, and the assignment points at it.
create function private.start_assignment(assignment uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a journal.story_assignments;
  contributor uuid;
  made uuid;
begin
  select * into a from journal.story_assignments where id = assignment;
  if not found or a.assignee_id is distinct from auth.uid() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.piece_id is not null then
    return a.piece_id;
  end if;
  -- The assignee's own byline: their register contributor, made once.
  select c.id into contributor from journal.contributors c
  where c.user_id = a.assignee_id and not c.is_pen_name and not c.is_anonymous
  limit 1;
  if contributor is null then
    insert into journal.contributors (slug, user_id, name_en, name_ar)
    select a.slug || '-' || substr(md5(random()::text), 1, 6), a.assignee_id,
      private.register_name(a.assignee_id), private.register_name(a.assignee_id)
    returning id into contributor;
  end if;
  -- The section's general type (the section follows from it), changed by
  -- the editor as the piece takes shape.
  insert into journal.pieces (slug, category, language, title_en, contributor_id, status)
  values (
    -- The assignment's working slug; the address follows the title until
    -- the piece is published (decisions.md, The site: addresses).
    case when exists (select 1 from journal.pieces x where x.slug = a.slug)
      then a.slug || '-' || substr(md5(random()::text), 1, 6) else a.slug end,
    (a.desk::text || '_other')::journal.category, 'en', a.angle, contributor, 'editing')
  returning id into made;
  update journal.story_assignments
  set piece_id = made, status = 'drafting', updated_at = now()
  where id = assignment;
  return made;
end;
$$;
revoke all on function private.start_assignment(uuid) from public, anon;

create function journal.start_assignment(assignment uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.start_assignment(assignment) $$;
revoke all on function journal.start_assignment(uuid) from public, anon;
grant execute on function private.start_assignment(uuid), journal.start_assignment(uuid)
  to authenticated;

-- ── The section's board ────────────────────────────────────────────────
-- One row per card: assignments before writing starts, then the pieces by
-- where they stand. Published shows the last 30 days.
create function private.desk_board(for_desk journal.desk)
returns table (
  stage text, kind text, id uuid, title text, person uuid, due_on date, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case a.status when 'pitched' then 'pitched' else 'assigned' end,
    'assignment', a.id, a.angle, a.assignee_id, a.due_on, a.updated_at
  from journal.story_assignments a
  where a.desk = for_desk and a.status in ('pitched', 'assigned', 'accepted')
    and private.is_desk_editor(for_desk)
  union all
  select
    case
      when p.status = 'published' then 'published'
      when p.status in ('approved', 'scheduled') then 'ready'
      when exists (select 1 from journal.approvals ap where ap.piece_id = p.id and ap.kind = 'chief')
        then 'copy'
      when p.author_requested_at is not null
        or exists (select 1 from journal.approvals ap where ap.piece_id = p.id and ap.kind = 'desk')
        then 'editing'
      else 'drafting'
    end,
    'piece', p.id, coalesce(nullif(p.title_en, ''), p.title_ar),
    (select c.user_id from journal.contributors c where c.id = p.contributor_id),
    a.due_on, p.updated_at
  from journal.pieces p
  left join journal.story_assignments a on a.piece_id = p.id
  where p.desk = for_desk
    and p.status <> 'unpublished'
    and (p.status <> 'published' or p.published_at > now() - interval '30 days')
    and private.is_desk_editor(for_desk)
  order by 6 nulls last, 7;
$$;
revoke all on function private.desk_board(journal.desk) from public, anon;

create function journal.desk_board(for_desk journal.desk)
returns table (
  stage text, kind text, id uuid, title text, person uuid, due_on date, updated_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$ select * from private.desk_board(for_desk) $$;
revoke all on function journal.desk_board(journal.desk) from public, anon;
grant execute on function private.desk_board(journal.desk), journal.desk_board(journal.desk)
  to authenticated;

-- ── Credits picked from the site's people, accepted ─────────────────────
alter table journal.piece_credits
  add column accepted_at timestamptz,
  add column added_by uuid default auth.uid() references auth.users (id) on delete set null;
create index piece_credits_added_by_idx on journal.piece_credits (added_by);
-- Credits already on record stand as accepted.
update journal.piece_credits set accepted_at = coalesce(accepted_at, now());

-- The person credited accepts it (or declines, which removes it).
create function private.answer_credit(piece uuid, contributor uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from journal.contributors c
    where c.id = contributor and c.user_id = auth.uid()
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if accept then
    update journal.piece_credits set accepted_at = now()
    where piece_id = piece and contributor_id = contributor;
  else
    delete from journal.piece_credits
    where piece_id = piece and contributor_id = contributor and accepted_at is null;
  end if;
end;
$$;
revoke all on function private.answer_credit(uuid, uuid, boolean) from public, anon;
create function journal.answer_credit(piece uuid, contributor uuid, accept boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.answer_credit(piece, contributor, accept) $$;
revoke all on function journal.answer_credit(uuid, uuid, boolean) from public, anon;
grant execute on function private.answer_credit(uuid, uuid, boolean),
  journal.answer_credit(uuid, uuid, boolean) to authenticated;

-- Credits waiting for the caller's answer.
create function private.my_credits_to_accept()
returns table (piece_id uuid, contributor_id uuid, role text, title_en text, title_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select pc.piece_id, pc.contributor_id, pc.role, p.title_en, p.title_ar
  from journal.piece_credits pc
  join journal.contributors c on c.id = pc.contributor_id
  join journal.pieces p on p.id = pc.piece_id
  where c.user_id = auth.uid() and pc.accepted_at is null;
$$;
revoke all on function private.my_credits_to_accept() from public, anon;
create function journal.my_credits_to_accept()
returns table (piece_id uuid, contributor_id uuid, role text, title_en text, title_ar text)
language sql stable security invoker set search_path = ''
as $$ select * from private.my_credits_to_accept() $$;
revoke all on function journal.my_credits_to_accept() from public, anon;
grant execute on function private.my_credits_to_accept(), journal.my_credits_to_accept()
  to authenticated;

-- A credit shows only once its holder accepts it: until then only the
-- piece's editors and the holder see it.
create function private.is_my_contributor(contributor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from journal.contributors c
                 where c.id = contributor and c.user_id = (select auth.uid()));
$$;
revoke all on function private.is_my_contributor(uuid) from public;
grant execute on function private.is_my_contributor(uuid) to anon, authenticated;

create policy "Only accepted credits are shown" on journal.piece_credits
  as restrictive for select to anon, authenticated
  using (
    accepted_at is not null
    or (select private.piece_editor(piece_id))
    or private.is_my_contributor(contributor_id)
  );

-- ── Reading copies: every view logged ──────────────────────────────────
create table journal.reading_views (
  id bigint generated always as identity primary key,
  entry_id uuid not null,
  reader_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index reading_views_entry_idx on journal.reading_views (entry_id, viewed_at);
create index reading_views_reader_id_idx on journal.reading_views (reader_id);

alter table journal.reading_views enable row level security;
create policy "No third-party apps" on journal.reading_views
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
-- A reader logs their own views; the Editor-in-Chief reads the log.
create policy "Readers log their views" on journal.reading_views
  for insert to authenticated
  with check (reader_id = (select auth.uid()));
create policy "The Editor-in-Chief reads the log" on journal.reading_views
  for select to authenticated
  using ((select private.has_permission_anywhere('journal.manage')));
grant select, insert (entry_id) on journal.reading_views to authenticated;
grant all on journal.reading_views to service_role;

-- The reading copy's text: the watermark names the reader (their short
-- name and card number), and each opening is logged.
create or replace function private.entry_text(entry uuid)
returns table (body_html text, source_text text, mark text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.can_read_entry(entry) then
    return;
  end if;
  if not private.has_reader_pledge() then
    raise exception 'Sign the confidentiality agreement first'
      using errcode = 'P0001', hint = 'reader_pledge';
  end if;
  insert into journal.reading_views (entry_id, reader_id) values (entry, auth.uid());
  return query
    select b.body_html, b.source_text,
      concat_ws(' · ',
        (select private.display_name(p, 'en') from core.profiles p where p.id = (select auth.uid())),
        case when c.number is not null then 'No. ' || lpad(c.number::text, 5, '0') end)
    from journal.blind_entries b
    left join membership.cards c on c.user_id = (select auth.uid())
    where b.id = entry;
end;
$$;
alter function journal.entry_text(uuid) volatile;

-- ── Today: an assignment to accept, a credit to answer ─────────────────
create or replace function core.my_todos()
returns table (kind text, ref text)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'esign', null::text
  from core.my_esign() e
  where e.asked_at is null and e.agreed_at is null
  union all
  select 'arabic_form', null
  from core.my_private_profile() p
  where p.title_form is null
  union all
  select 'name', null
  from core.my_name_parts() n
  where not (
    nullif(btrim(n.first_name_en), '') is not null
    and ((nullif(btrim(n.father_name_en), '') is not null and nullif(btrim(n.grandfather_name_en), '') is not null)
         or nullif(btrim(n.last_name_en), '') is not null)
    and nullif(btrim(n.first_name_ar), '') is not null
    and ((nullif(btrim(n.father_name_ar), '') is not null and nullif(btrim(n.grandfather_name_ar), '') is not null)
         or nullif(btrim(n.last_name_ar), '') is not null)
  )
  union all
  select 'personal_email', null
  from core.my_addresses() a
  where a.left_auib_at is not null and a.sign_in_auib and not coalesce(a.personal_verified, false)
  union all
  select 'renewal', null where membership.renewal_due()
  union all
  select 'role_agreement', g.assignment_id::text
  from access.my_unsigned_role_agreements() g
  union all
  select 'role_steps', c.assignment_id::text
  from access.my_role_checklist() c
  where not c.done
    and not (c.step = 'pledge' and exists (
      select 1 from access.my_unsigned_role_agreements() g
      where g.assignment_id = c.assignment_id))
  group by c.assignment_id
  union all
  select 'handover', h.assignment_id::text
  from access.my_handovers_due() h
  union all
  -- An assignment waiting to be accepted.
  select 'assignment', s.id::text
  from journal.story_assignments s
  where s.assignee_id = (select auth.uid()) and s.status = 'assigned'
  union all
  -- A credit on someone's piece, to accept.
  select 'credit', c.piece_id::text || ':' || c.contributor_id::text
  from journal.my_credits_to_accept() c;
$$;

select private.build_api();
