-- The Society has no money (decisions.md, Money): a production's report
-- keeps no amounts.
alter table programmes.productions
  drop column report_money_in_iqd,
  drop column report_money_out_iqd;
