import { EmailConfigError } from "./config-error";
import { EmailQuotaError } from "./quota-error";

export { EmailConfigError } from "./config-error";
export { EmailQuotaError } from "./quota-error";

const QUOTA_ERRORS = new Set([
  "daily_quota_exceeded",
  "monthly_quota_exceeded",
]);

const CONFIG_ERRORS = new Set([
  "invalid_api_key",
  "invalid_from_address",
  "missing_api_key",
  "restricted_api_key",
]);
const CONFIG_MESSAGE = /api key|domain is not verified|not verified/iu;

/** Which error a failed send is: the plan's limit, the configuration, or the email. */
export const sendError = (error: { message: string; name: string }) => {
  if (QUOTA_ERRORS.has(error.name)) {
    return new EmailQuotaError(error.message);
  }
  if (CONFIG_ERRORS.has(error.name) || CONFIG_MESSAGE.test(error.message)) {
    return new EmailConfigError(error.message);
  }
  return new Error(error.message);
};
