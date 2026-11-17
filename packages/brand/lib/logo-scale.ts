/**
 * How tall a logo stands in its box so wide and tall logos look equally
 * heavy (decisions.md, The site: "Partners and sponsors on the site"): a
 * square logo fills the box; a wider one is shorter by the square root of
 * its proportions (a 4:1 wordmark stands at half the box, twice as wide),
 * which keeps their areas close; a tall one never passes the box.
 */
export const logoScale = (width: number, height: number) => {
  if (!(width > 0 && height > 0)) {
    return 1;
  }
  return Math.min(1, Math.sqrt(height / width));
};
