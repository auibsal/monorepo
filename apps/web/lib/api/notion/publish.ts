import "server-only";

import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { sanitizeRichText } from "@/lib/data";
import { uploadMedia } from "@/lib/storage";
import { pageHtml } from "./blocks";
import type { NotionPage } from "./client";
import { count, problem, type SyncContext } from "./context";
import { prop, read } from "./props";

/**
 * What the Notion pages the site still reads share (documents and
 * minutes): the stamp, the "what to fix" note, who last edited a page, and
 * a page's text and first image. Events are no longer published from
 * Notion: they are made and edited in the Diwan, and Notion's Events
 * database is a read-only copy (decisions.md, Events; events.ts).
 */

export const stamp = () => {
  const now = new Date().toISOString();
  return `${formatLongDate(now, "en")}, ${formatClock(now, "en")}`;
};

export const needsChanges = async (
  ctx: SyncContext,
  page: NotionPage,
  problems: string[]
) => {
  const note = `Not published (${stamp()}): ${problems.join(" ")}`;
  await ctx.notion.updatePage(page.id, {
    "Platform note": prop.text(note),
    Status: prop.select("Needs changes"),
  });
  await ctx.notion.comment(page.id, note);
  count(ctx, "publish.refused");
};

/** The email of the person who last edited the page, if Notion shares it. */
export const editorEmail = async (ctx: SyncContext, page: NotionPage) => {
  const id = page.last_edited_by?.id;
  if (!id) {
    return null;
  }
  const user = await ctx.notion.user(id).catch(() => null);
  return user?.type === "person" ? (user.person?.email ?? null) : null;
};

export const NO_EMAIL =
  "The platform could not see who set the status. In Notion, open Settings, Connections, SAL Platform, and allow it to read user information including email addresses.";

/**
 * Who published, as their seat ("the President"), never their name: no
 * personal data in Notion (decisions.md, Where things live). The first of
 * their current roles in the Council's order; "an officer" otherwise.
 */
export const publisherSeat = async (ctx: SyncContext, userId: string) => {
  const now = new Date().toISOString();
  const { data } = await ctx.admin
    .schema("api")
    .from("role_assignments")
    .select("ends_at, starts_at, role:roles(name_en, sort, retired)")
    .eq("user_id", userId)
    .or(`ends_at.is.null,ends_at.gt.${now}`);
  const [seat] = (data ?? [])
    .filter((a) => a.starts_at <= now)
    .map((a) => a.role)
    .filter((r): r is { name_en: string; retired: boolean; sort: number } =>
      Boolean(r && !r.retired)
    )
    .sort((a, b) => a.sort - b.sort);
  return seat ? `the ${seat.name_en}` : "an officer";
};

/** The page's first image, copied to the public media bucket. */
export const copyImage = async (
  ctx: SyncContext,
  page: NotionPage,
  property: string,
  area: string
) => {
  const [file] = read.files(page, property);
  if (!file) {
    return;
  }
  const response = await fetch(file.url, {
    signal: AbortSignal.timeout(20_000),
  });
  const type = response.headers.get("content-type") ?? "";
  if (!(response.ok && type.startsWith("image/"))) {
    problem(ctx, `Could not copy the image on ${page.id}.`);
    return;
  }
  const bytes = await response.arrayBuffer();
  const stored = await uploadMedia(
    ctx.admin,
    area,
    new File([bytes], file.name || "image", { type })
  );
  return stored.path;
};

/** A one-language page's text as sanitized HTML, or null when it is empty. */
export const bodyOf = async (ctx: SyncContext, page: NotionPage) => {
  const html = pageHtml(await ctx.notion.blocksWithTables(page.id));
  return html ? sanitizeRichText(html) : null;
};

export const publishedNote = (who: string) => `Published ${stamp()} by ${who}.`;
