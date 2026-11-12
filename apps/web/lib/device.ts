/**
 * A device's browser and system from its user agent, as shown in Settings
 * and in the new-device email ("Chrome · Windows"). Names only, never
 * versions: they are the same in both languages.
 */
const BROWSERS: readonly [RegExp, string][] = [
  [/Edg\//u, "Edge"],
  [/OPR\//u, "Opera"],
  [/SamsungBrowser\//u, "Samsung Internet"],
  [/Firefox\/|FxiOS\//u, "Firefox"],
  [/Chrome\/|CriOS\//u, "Chrome"],
  [/Safari\//u, "Safari"],
];

const SYSTEMS: readonly [RegExp, string][] = [
  [/iPhone/u, "iPhone"],
  [/iPad/u, "iPad"],
  [/Android/u, "Android"],
  [/Windows/u, "Windows"],
  [/Mac OS X|Macintosh/u, "macOS"],
  [/CrOS/u, "ChromeOS"],
  [/Linux/u, "Linux"],
];

const first = (list: readonly [RegExp, string][], agent: string) =>
  list.find(([pattern]) => pattern.test(agent))?.[1];

export const deviceName = (userAgent: unknown) => {
  const agent = typeof userAgent === "string" ? userAgent : "";
  const parts = [first(BROWSERS, agent), first(SYSTEMS, agent)].filter(
    (part): part is string => Boolean(part)
  );
  return parts.length > 0 ? parts.join(" · ") : "?";
};
