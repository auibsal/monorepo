-- Retired leftovers (the Nov 7 audit, B6). Charity collections are a Notion
-- record, not a site feature (decisions §3), so the receipts bucket goes;
-- it holds no files anywhere. The protect_delete guard is lifted for this
-- statement only, and only an empty bucket is removed.
set local storage.allow_delete_query = 'true';
delete from storage.buckets b
where b.id = 'receipts'
  and not exists (select 1 from storage.objects o where o.bucket_id = b.id);
