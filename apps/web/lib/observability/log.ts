type Level = "debug" | "info" | "warn" | "error";
type Attributes = Record<string, string | number | boolean>;

/** Server logs, printed to the Vercel runtime log. */
const at =
  (level: Level) =>
  (message: string, attributes?: Attributes): void => {
    console[level](message, ...(attributes ? [attributes] : []));
  };

export const log = {
  debug: at("debug"),
  error: at("error"),
  info: at("info"),
  warn: at("warn"),
};
