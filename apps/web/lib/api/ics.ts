/**
 * Minimal RFC 5545 calendar writer: escaping, 75-octet line folding, CRLF
 * line endings and UTC timestamps.
 */
export interface IcsEvent {
  /** A whole day (or days): written as dates, not times. */
  allDay?: boolean;
  description?: string | null;
  end?: string | null;
  location?: string | null;
  start: string;
  /** Marked in the summary, e.g. "[RSVP]" or "[AUIB]". */
  tag?: string;
  title: string;
  uid: string;
  url?: string | null;
}

const BACKSLASH = /\\/g;
const SEMICOLON = /;/g;
const COMMA = /,/g;
const NEWLINE = /\r?\n/g;
const DASH_OR_COLON = /[-:]/g;
const MILLISECONDS = /\.\d{3}/;

// RFC 5545 §3.3.11: backslash, semicolon and comma are escaped with "\".
const escapeText = (value: string) =>
  value
    .replace(BACKSLASH, String.raw`\\`)
    .replace(SEMICOLON, String.raw`\;`)
    .replace(COMMA, String.raw`\,`)
    .replace(NEWLINE, String.raw`\n`);

const stamp = (value: string | Date) =>
  new Date(value)
    .toISOString()
    .replace(DASH_OR_COLON, "")
    .replace(MILLISECONDS, "");

/** A date value (YYYYMMDD) for a whole-day event. */
const day = (value: string | Date) =>
  new Date(value).toISOString().slice(0, 10).replace(DASH_OR_COLON, "");

const DAY = 86_400_000;

const encoder = new TextEncoder();

/** Folds a content line at 75 octets without splitting a UTF-8 character. */
export const fold = (line: string) => {
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
};

export const renderCalendar = (
  name: string,
  events: IcsEvent[],
  now = new Date()
) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AUIB Society of Arts and Letters//auibsal.org//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Asia/Baghdad",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];
  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${stamp(now)}`);
    if (event.allDay) {
      // DTEND of a date is exclusive (as the AUIB feed gives it); a day
      // without an end runs to the next day.
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : start;
      const until = end > start ? end : new Date(start.getTime() + DAY);
      lines.push(
        `DTSTART;VALUE=DATE:${day(start)}`,
        `DTEND;VALUE=DATE:${day(until)}`
      );
    } else {
      const end =
        event.end ??
        new Date(new Date(event.start).getTime() + 2 * 3_600_000).toISOString();
      lines.push(`DTSTART:${stamp(event.start)}`, `DTEND:${stamp(end)}`);
    }
    lines.push(
      `SUMMARY:${escapeText(event.tag ? `${event.tag} ${event.title}` : event.title)}`
    );
    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    if (event.url) {
      lines.push(`URL:${event.url}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
};

export const icsResponse = (body: string, filename: string) =>
  new Response(body, {
    headers: {
      "Cache-Control": "private, max-age=900",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
