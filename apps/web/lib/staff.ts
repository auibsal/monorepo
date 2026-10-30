// Whether the signed-in person holds a role, remembered in a cookie so the
// public pages (which have no session client) can offer the Diwan under
// Membership. A hint for the header, never for access: the Diwan's own gate
// (RequireStaff) and Row Level Security decide.

export const STAFF_COOKIE = "sal_diwan";

/** Whether the cookies say the visitor opens the Diwan. */
export const hasStaffCookie = (cookies: string) =>
  cookies.split(";").some((pair) => pair.trim() === `${STAFF_COOKIE}=1`);

/** Remembers (or forgets) that the visitor opens the Diwan. */
export const rememberStaff = (staff: boolean) => {
  // biome-ignore lint/suspicious/noDocumentCookie: a plain hint cookie, read back by hasStaffCookie.
  document.cookie = staff
    ? `${STAFF_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    : `${STAFF_COOKIE}=; path=/; max-age=0; samesite=lax`;
};
