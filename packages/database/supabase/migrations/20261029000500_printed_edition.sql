-- The Edition is printed (owner, Oct 29, 2026). Each Edition's record keeps
-- its printed edition: how many copies, who printed it and when. The
-- Edition page shows it as one line ("Printed by …, Tuesday, April 20:
-- 300 copies."). The issues table's policies already cover the new columns.

alter table journal.issues
  add column print_run integer check (print_run > 0 and print_run <= 100000),
  add column printer_en text check (char_length(printer_en) <= 200),
  add column printer_ar text check (char_length(printer_ar) <= 200),
  add column printed_on date;

comment on column journal.issues.print_run is 'Copies printed of this Edition.';
comment on column journal.issues.printed_on is 'The day the printer delivered the printed edition.';
