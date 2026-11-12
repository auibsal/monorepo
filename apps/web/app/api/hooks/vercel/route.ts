import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { staffAlert } from "@/lib/api/bot/upkeep";
import { problem } from "@/lib/api/problem";

const event = z.object({
  id: z.string(),
  payload: z
    .object({
      deployment: z.object({ url: z.string().optional() }).partial().optional(),
      links: z
        .object({ deployment: z.string().optional() })
        .partial()
        .optional(),
      target: z.string().nullable().optional(),
    })
    .partial()
    .optional(),
  type: z.string(),
});

/** Vercel signs the raw body with HMAC-SHA1 (x-vercel-signature). */
const signed = (secret: string, body: string, signature: string | null) => {
  if (!signature) {
    return false;
  }
  const expected = createHmac("sha1", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * POST /api/hooks/vercel: Vercel's webhook. A production deploy that fails
 * becomes an urgent staff alert in the Council's topic of the Diwan group
 * (decisions.md: staff alerts go to the team's topic and the Desk).
 */
export const POST = async (request: Request) => {
  const secret = env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    return problem(503, "not_configured");
  }
  const body = await request.text();
  if (!signed(secret, body, request.headers.get("x-vercel-signature"))) {
    return problem(401, "unauthorized");
  }
  const parsed = event.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const { id, payload, type } = parsed.data;
  const production = (payload?.target ?? "production") === "production";
  if (
    production &&
    (type === "deployment.error" || type === "deployment.canceled")
  ) {
    const link = payload?.links?.deployment;
    await staffAlert({
      key: `vercel:${id}`,
      link: link?.startsWith("https://") ? link : undefined,
      team: "council",
      text_ar:
        "فشل نشر الموقع على Vercel، فما زالت النسخة السابقة تعمل. افتح سجل النشر لمعرفة السبب.",
      text_en:
        "A deploy of the site failed on Vercel; the previous version is still live. Open the deploy's log to see why.",
      urgent: true,
    });
  }
  return NextResponse.json({ ok: true });
};
