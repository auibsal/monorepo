import { createAdminClient } from "@repo/database/admin";
import { memberFeed } from "@/lib/api/calendar";
import { icsResponse, renderCalendar } from "@/lib/api/ics";
import { problem } from "@/lib/api/problem";

const TOKEN = /^[0-9a-f]{48}$/;
const ICS_SUFFIX = /\.ics$/;

/** GET /calendar/feed/<token>.ics — a member's private iCal feed. */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) => {
  const token = (await params).token.replace(ICS_SUFFIX, "");
  if (!TOKEN.test(token)) {
    return problem(404, "not_found");
  }

  const feed = await memberFeed(createAdminClient(), token);
  if (!feed) {
    return problem(404, "not_found");
  }

  const name =
    feed.locale === "ar"
      ? "جمعية الفنون والآداب"
      : "SAL · AUIB Society of Arts and Letters";
  return icsResponse(renderCalendar(name, feed.events), "sal.ics");
};
