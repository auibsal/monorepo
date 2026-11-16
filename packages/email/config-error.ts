/**
 * The email key or its domain is wrong (a missing, invalid or restricted
 * key, an unverified domain). Nothing is wrong with the email; the outbox
 * keeps it and sends it once the configuration is fixed.
 */
export class EmailConfigError extends Error {
  override name = "EmailConfigError";
}
