-- The American Space's logo (the owner, Nov 25, 2026): one lockup of the
-- U.S. flag, the seal of the United States Mission Iraq, the American
-- Spaces mark and AUIB's, in their own colors, 3832 × 600, in AUIB's standard set
-- (apps/web/public/institutions/american-space-logo-color.png). One file
-- only: there is no white version, so the separate one uploaded for the
-- promo kit goes, and its pictures on ink name the American Space in words.
-- The width is the lockup's at the set's 325 high, to a tenth: a wide
-- lockup (about 6.4 to 1) needs more room than the old 2000.
alter table governance.partners drop constraint partners_logo_width_check;
alter table governance.partners add constraint partners_logo_width_check
  check (logo_width between 100 and 3000);

update governance.partners
set logo_width = 2075.7,
  logo_white_path = null
where slug = 'american-space';
