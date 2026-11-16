/**
 * The plan's daily or monthly sending limit is spent (the free plan allows
 * 100 a day). Nothing is wrong with the email; send it again after the
 * limit resets.
 */
export class EmailQuotaError extends Error {
  override name = "EmailQuotaError";
}
