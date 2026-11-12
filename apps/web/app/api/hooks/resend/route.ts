import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { staffAlert } from "@/lib/api/bot/upkeep";
import { problem } from "@/lib/api/problem";
import { verifySvix } from "@/lib/api/svix";
import { log } from "@/lib/observability/log";

const event = z.object({
  data: z
    .object({
      bounce: z.object({ type: z.string().optional() }).partial().optional(),
      email_id: z.string().optional(),
      to: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .partial(),
  type: z.string(),
});

/**
 * POST /api/hooks/resend: Resend's webhook (audit D3). A hard bounce or a
 * complaint puts the address on core.email_suppressions, which the outbox
 * and the Broadcasts check before writing. Signed by Resend (Svix), with
 * RESEND_WEBHOOK_SECRET; anything unsigned is refused.
 */
export const POST = async (request: Request) => {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return problem(503, "not_configured");
  }
  const body = await request.text();
  if (!verifySvix(secret, request.headers, body)) {
    return problem(401, "unauthorized");
  }
  const parsed = event.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const { data, type } = parsed.data;
  let reason: "bounced" | "complained" | null = null;
  if (type === "email.complained") {
    reason = "complained";
  } else if (
    type === "email.bounced" &&
    (data.bounce?.type ?? "Permanent").toLowerCase() !== "transient"
  ) {
    reason = "bounced";
  }
  if (!reason) {
    return NextResponse.json({ ok: true });
  }
  const to = Array.isArray(data.to) ? data.to : [data.to ?? ""];
  const rows = to
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"))
    .map((email) => ({
      email,
      event_id: request.headers.get("svix-id"),
      reason,
    }));
  // Media hears of it in its topic of the Diwan group (decisions.md: staff
  // alerts): a complaint at once, a bounce in the morning's digest. No
  // address, only what happened.
  await staffAlert({
    key: `resend:${request.headers.get("svix-id") ?? data.email_id ?? ""}`,
    team: "media",
    text_ar:
      reason === "complained"
        ? "أبلغ أحد القرّاء عن رسالة من الجمعية بأنها مزعجة، فأُوقف عنوانه. إن تكررت البلاغات فراجع عدد الرسائل ومحتواها."
        : "ارتدّت رسالة من الجمعية عن عنوان غير صالح، فأُوقف العنوان.",
    text_en:
      reason === "complained"
        ? "A reader marked a Society email as spam, and their address is now stopped. If more follow, look at how often and what we send."
        : "A Society email bounced from an address that doesn't work, and the address is now stopped.",
    urgent: reason === "complained",
  }).catch(() => undefined);
  if (rows.length) {
    const { error } = await createAdminClient()
      .schema("core")
      .from("email_suppressions")
      .upsert(rows, { onConflict: "email" });
    if (error) {
      log.error(`Suppression not kept: ${error.message}`);
      return problem(500, "failed");
    }
  }
  return NextResponse.json({ ok: true });
};
