/**
 * The one address each on-demand route prerenders at build time (Cache
 * Components needs at least one): never a real slug, so it renders the
 * route's not-found page. Real pages are made on their first visit.
 */
export const PLACEHOLDER_SLUG = "_";
