-- "With the support of" (decisions §2, §18): AUIB's own offices, listed
-- on the partners page only. They support the Society but aren't
-- partners. Partnerships keeps the list in the Diwan; the logos are AUIB's
-- standard set, served from apps/web/public/institutions.

create table governance.supporters (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 120),
  name_ar text not null check (char_length(btrim(name_ar)) between 1 and 120),
  url text check (url ~ '^https://[^\s]+$' and char_length(url) <= 300),
  -- One of the logo files in apps/web/public/institutions, or none (the
  -- name is shown instead).
  logo text check (logo in ('auib', 'student-life', 'cas', 'press', 'library')),
  logo_width integer check (logo_width between 100 and 2000),
  sort integer not null default 0,
  shown boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((logo is null) = (logo_width is null))
);

comment on table governance.supporters is
  'AUIB''s offices under "With the support of" on /partners (decisions §2), kept by Partnerships in the Diwan.';

alter table governance.supporters enable row level security;

create policy "No third-party apps" on governance.supporters
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

create policy "Anyone reads the supporters shown" on governance.supporters
  for select to anon, authenticated
  using (shown or (select private.has_permission('partners.manage')));
create policy "Partnerships adds supporters" on governance.supporters
  for insert to authenticated
  with check ((select private.has_permission('partners.manage')));
create policy "Partnerships edits supporters" on governance.supporters
  for update to authenticated
  using ((select private.has_permission('partners.manage')))
  with check ((select private.has_permission('partners.manage')));
create policy "Partnerships removes supporters" on governance.supporters
  for delete to authenticated
  using ((select private.has_permission('partners.manage')));

grant select on governance.supporters to anon, authenticated;
grant insert, update, delete on governance.supporters to authenticated;
grant all on governance.supporters to service_role;

create trigger supporters_updated_at before update on governance.supporters
  for each row execute function private.set_updated_at();

-- The five offices the partners page listed until now.
insert into governance.supporters (name_en, name_ar, url, logo, logo_width, sort) values
  ('The American University of Iraq – Baghdad', 'الجامعة الأمريكية في بغداد', 'https://auib.edu.iq', 'auib', 1036, 10),
  ('Office of Student Life', 'مكتب شؤون الطلبة', 'https://auib.edu.iq/student-affairs/students-life/', 'student-life', 711, 20),
  ('College of Arts and Sciences', 'كلية الآداب والعلوم', 'https://auib.edu.iq/academics/college-of-arts-sciences/', 'cas', 871, 30),
  ('AUIB Press', 'دار نشر الجامعة الأمريكية في بغداد', 'https://auib.edu.iq/research-and-institutional-centers/auib-press/', 'press', 667, 40),
  ('AUIB Library', 'مكتبة الجامعة الأمريكية في بغداد', 'https://library.auib.edu.iq/', 'library', 721, 50);

-- The partners page is cached; a change refreshes it.
create trigger revalidate after insert or update or delete on governance.supporters
  for each statement execute function private.queue_revalidation('partners');
