-- The American Space's logo (the owner, Nov 25, 2026): one lockup of the
-- U.S. flag, the seal of the United States Mission Iraq and the American
-- Spaces mark, in their own colors, 3017 × 600, in AUIB's standard set
-- (apps/web/public/institutions/american-space-logo-color.png). One file
-- only: there is no white version, so the separate one uploaded for the
-- promo kit goes, and its pictures on ink name the American Space in words.
-- The width is the lockup's at the set's 325 high, to a tenth.
update governance.partners
set logo_width = 1634.2,
  logo_white_path = null
where slug = 'american-space';
