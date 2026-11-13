/**
 * Whether a save failed because the full name belongs to another account
 * (private.one_person_one_name raises `name_taken`).
 */
export const isNameTaken = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      String((error as { message: unknown }).message).includes("name_taken")
  );

/**
 * Whether a save failed because it touched a part of the official name
 * already on record (private.legal_name_locked raises `legal_name_locked`);
 * only the Diwan's Membership corrects those.
 */
export const isNameLocked = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      String((error as { message: unknown }).message).includes(
        "legal_name_locked"
      )
  );
