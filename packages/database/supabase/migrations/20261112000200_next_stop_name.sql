-- Next Stop's Arabic name is «المحطة التالية» (decisions.md, What the
-- Society does; the glossary), wherever the database keeps it: the role
-- titles, the program's name and any opening that copied a role's title.
-- Team roles are lowercase (decisions.md, Standards).

update access.roles
set name_ar = replace(name_ar, 'المحطة القادمة', 'المحطة التالية'),
    name_ar_feminine = replace(name_ar_feminine, 'المحطة القادمة', 'المحطة التالية')
where name_ar like '%المحطة القادمة%' or name_ar_feminine like '%المحطة القادمة%';

update access.roles set name_en = 'Next Stop host' where key = 'next_stop_host';
update access.roles set name_en = 'Next Stop producer' where key = 'next_stop_producer';

update core.programmes
set name_ar = replace(name_ar, 'المحطة القادمة', 'المحطة التالية')
where name_ar like '%المحطة القادمة%';

update programmes.openings
set title_ar = replace(title_ar, 'المحطة القادمة', 'المحطة التالية')
where title_ar like '%المحطة القادمة%';

update programmes.openings set title_en = 'Next Stop producer' where title_en = 'Next Stop Producer';
update programmes.openings set title_en = 'Next Stop host' where title_en = 'Next Stop Host';
