-- File types the buckets take (audit E6).
--
-- The public media bucket no longer takes SVG (a script can ride in one);
-- the Edition's PDF stays. The private library takes documents and
-- images only, named here instead of anything at all.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'media';

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'library';
