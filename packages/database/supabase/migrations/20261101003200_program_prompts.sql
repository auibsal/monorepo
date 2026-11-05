-- The design review, PR 4e (Nov 4, 2026), A35: Open Pages prompt cards.
-- The host writes the evening's prompts in the Diwan (the program's
-- Prompts tab) and publishes the ones to show; the program's page shows
-- the published cards. A prompt belongs to a program, so another program
-- may keep its own later; only Open Pages shows them today.

create table programmes.prompts (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references core.programmes (id) on delete cascade,
  text_en text not null default '' check (char_length(text_en) <= 300),
  text_ar text not null default '' check (char_length(text_ar) <= 300),
  is_published boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint prompts_say_something check (text_en <> '' or text_ar <> '')
);

comment on table programmes.prompts is
  'Writing prompts a program''s host keeps (Open Pages): published cards show on the program''s page.';

create index prompts_programme_idx on programmes.prompts (programme_id, created_at desc);
create index prompts_created_by_idx on programmes.prompts (created_by);

alter table programmes.prompts enable row level security;

revoke all on programmes.prompts from anon, authenticated;
grant select on programmes.prompts to anon, authenticated;
grant insert (programme_id, text_en, text_ar, is_published) on programmes.prompts to authenticated;
grant update (text_en, text_ar, is_published) on programmes.prompts to authenticated;
grant delete on programmes.prompts to authenticated;
grant all on programmes.prompts to service_role;

create policy "No third-party apps" on programmes.prompts
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

create policy "Anyone reads published prompts" on programmes.prompts
  for select to anon using (is_published);
create policy "Published prompts, and the program's own for its managers" on programmes.prompts
  for select to authenticated using (
    is_published
    or (select private.has_permission('programs.manage', 'programme', programme_id))
  );
create policy "Program managers write prompts" on programmes.prompts
  for insert to authenticated
  with check ((select private.has_permission('programs.manage', 'programme', programme_id)));
create policy "Program managers change prompts" on programmes.prompts
  for update to authenticated
  using ((select private.has_permission('programs.manage', 'programme', programme_id)))
  with check ((select private.has_permission('programs.manage', 'programme', programme_id)));
create policy "Program managers remove prompts" on programmes.prompts
  for delete to authenticated
  using ((select private.has_permission('programs.manage', 'programme', programme_id)));

-- Changes read in the activity log like other program records.
create trigger log_activity
  after insert or update or delete on programmes.prompts
  for each row execute function private.log_activity();
