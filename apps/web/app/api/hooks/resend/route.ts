import { createAdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { verifySvix } from "@/lib/api/svix";

const event = z.object({
  data: z
    .object({
      bounce: z.object({ type: z.string().optional() }).partial().optional(),
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
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const body = await request.text();
  if (!verifySvix(secret, request.headers, body)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  if (rows.length) {
    const { error } = await createAdminClient()
      .schema("core")
      .from("email_suppressions")
      .upsert(rows, { onConflict: "email" });
    if (error) {
      log.error(`Suppression not kept: ${error.message}`);
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
};
