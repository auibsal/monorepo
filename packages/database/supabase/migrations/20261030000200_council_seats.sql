-- The Council page (owner, Oct 30, 2026) lists every seat on the Council
-- by its full title, with its holder, or the officer who covers it while
-- it is open. Three officers (President, Vice President, General
-- Secretary) and five directors (Editor of Qirtas, Programs, Media,
-- Partnerships, Membership); there is no Treasurer. Holders are named as
-- the decisions file spells them; not everyone has an account yet, so the
-- names are kept with the seat. The General Secretary keeps the list in
-- the Diwan (governance.manage).

create table governance.council_seats (
  key text primary key check (key ~ '^[a-z_]+$'),
  kind text not null check (kind in ('officer', 'director')),
  title_en text not null,
  title_ar text not null,
  holder_en text,
  holder_ar text,
  covered_by text references governance.council_seats (key) on delete set null,
  sort integer not null default 0,
  updated_at timestamptz not null default now(),
  check (covered_by is null or covered_by <> key),
  check (holder_en is null or covered_by is null),
  check (holder_ar is null or holder_en is not null)
);

comment on table governance.council_seats is
  'The Council page: each seat by its full title, its holder or the seat that covers it. Public.';

create index council_seats_covered_by_idx on governance.council_seats (covered_by);

create trigger set_updated_at before update on governance.council_seats
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on governance.council_seats
  for each row execute function private.log_activity();

alter table governance.council_seats enable row level security;

create policy "Select by anon" on governance.council_seats
  for select to anon
  using (true);
create policy "Select by authenticated" on governance.council_seats
  for select to authenticated
  using (true);
create policy "The General Secretary adds seats" on governance.council_seats
  for insert to authenticated
  with check ((select private.has_permission('governance.manage')));
create policy "The General Secretary edits seats" on governance.council_seats
  for update to authenticated
  using ((select private.has_permission('governance.manage')))
  with check ((select private.has_permission('governance.manage')));
create policy "The General Secretary removes seats" on governance.council_seats
  for delete to authenticated
  using ((select private.has_permission('governance.manage')));
create policy "Third-party apps reach only their areas" on governance.council_seats
  as restrictive for all to authenticated
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

revoke all on governance.council_seats from anon, authenticated;
grant select on governance.council_seats to anon;
grant select, insert, update, delete on governance.council_seats to authenticated;
grant all on governance.council_seats to service_role;

-- The holders, Oct 30, 2026. Arabic spellings of the names are still to
-- come (TODO(content) in PROGRESS.md); the pages show the English name
-- until they are added.
insert into governance.council_seats (key, kind, title_en, title_ar, holder_en, covered_by, sort) values
  ('president', 'officer', 'President', 'الرئيس', 'Shaheen Farjo', null, 10),
  ('vice_president', 'officer', 'Vice President', 'نائب الرئيس', 'Fajer Saif Khalid Ezzet', null, 20),
  ('general_secretary', 'officer', 'General Secretary', 'الأمين العام', 'Yaqoob Ghassan Al-Azzawi', null, 30),
  ('editor_of_qirtas', 'director', 'Editor of Qirtas', 'رئيس تحرير قرطاس', 'Mohammed-Ali Ehsan Ohmaid', null, 40),
  ('director_of_programs', 'director', 'Director of Programs', 'مدير البرامج', null, 'president', 50),
  ('director_of_media', 'director', 'Director of Media', 'مدير الإعلام', 'Ali Hayder', null, 60),
  ('director_of_partnerships', 'director', 'Director of Partnerships', 'مدير الشراكات', null, 'vice_president', 70),
  ('director_of_membership', 'director', 'Director of Membership', 'مدير العضوية', null, 'general_secretary', 80);
