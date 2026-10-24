Fonts and logos for the drawn share images (`app/[locale]/og`).

- `Ubuntu-Light.ttf`: Ubuntu Light (300), Latin, from Fontsource (Ubuntu
  Font Licence), for English headlines.
- `UbuntuArabic-Regular.ttf`: `brand/fonts/UbuntuArabic-Regular.ttf` with the
  GSUB/GPOS Extension lookups (types 7 and 9) rewritten as the lookups they
  wrap, so Satori can read them. Glyphs and shaping data are unchanged.
  Regenerate with fontTools: for each Extension lookup, set `LookupType` to
  the wrapped type and `SubTable` to the `ExtSubTable` list, then save.
- `sal-lockup-horizontal.svg`, `sal-lockup-horizontal-ar.svg`: from
  `brand/logos`, byte for byte (one per language).
