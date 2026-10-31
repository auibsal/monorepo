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
