-- Records people can read (decisions.md, Governance): adopted resolutions
-- (number, title, date) are open to members beside the approved minutes;
-- resolutions about partners and documents are public.

alter table governance.resolutions
  add column subject text not null default 'other'
    check (subject in ('partner', 'document', 'other'));

comment on column governance.resolutions.subject is
  'What it is about: a partner or a document (public once adopted) or anything else (members only).';

-- The Council's votes on partners are already linked.
update governance.resolutions r set subject = 'partner'
where exists (select 1 from governance.partner_agreements a where a.resolution_id = r.id)
   or exists (select 1 from governance.partner_invitations i where i.resolution_id = r.id);

drop policy "Anyone reads adopted resolutions" on governance.resolutions;
create policy "Anyone reads adopted resolutions" on governance.resolutions
  for select to anon
  using (status = 'adopted' and subject in ('partner', 'document'));

drop policy "Select by authenticated" on governance.resolutions;
create policy "Select by authenticated" on governance.resolutions
  for select to authenticated
  using (
    (status = 'adopted' and (
      subject in ('partner', 'document')
      or (select private.membership_is_member())
    ))
    or (select private.has_permission('governance.minutes.write'))
    or (select private.has_permission('governance.manage'))
  );
comment on policy "Select by authenticated" on governance.resolutions is
  'Adopted resolutions: about partners and documents for everyone, the rest for members; minute-takers read all.';

-- A resolution the Council's partner vote links is about a partner.
create function private.mark_partner_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.resolution_id is not null then
    update governance.resolutions set subject = 'partner'
    where id = new.resolution_id and subject <> 'partner';
  end if;
  return new;
end;
$$;

revoke all on function private.mark_partner_resolution() from public, anon, authenticated;

create trigger mark_partner_resolution after insert or update of resolution_id
  on governance.partner_agreements
  for each row execute function private.mark_partner_resolution();
create trigger mark_partner_resolution after insert or update of resolution_id
  on governance.partner_invitations
  for each row execute function private.mark_partner_resolution();
