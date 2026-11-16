import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { staffAlert } from "@/lib/api/bot/upkeep";
import { problem } from "@/lib/api/problem";

const RUN_URL =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+$/u;

const body = z.object({
  run_url: z.string().regex(RUN_URL),
  workflow: z.enum(["backup", "deploy", "migrate"]),
});

const WHAT = {
  backup: {
    ar: "فشل النسخ الاحتياطي الليلي لقاعدة البيانات. افتح التشغيل لمعرفة السبب.",
    en: "Tonight's backup of the production database failed. Open the run to see why.",
  },
  deploy: {
    ar: "لم يكتمل نشر الموقع بعد ترحيل قاعدة البيانات. افتح التشغيل لمعرفة السبب.",
    en: "The site's deploy after the database migration did not finish. Open the run to see why.",
  },
  migrate: {
    ar: "فشل ترحيل قاعدة البيانات في الإنتاج، فلم يُنشر الموقع. افتح التشغيل لمعرفة السبب.",
    en: "The production database migration failed, so the site was not deployed. Open the run to see why.",
  },
} as const;

/**
 * POST /api/hooks/workflow: a GitHub workflow that failed (the nightly
 * backup, the migration and the deploy after it) says so here, with
 * CRON_SECRET as its bearer token. Each becomes an urgent alert in the
 * Diwan group's web topic and on the Desk (decisions.md, The site: no
 * silent failures).
 */
export const POST = async (request: Request) => {
  if (!hasBearer(request, env.CRON_SECRET)) {
    return problem(401, "unauthorized");
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, "invalid");
  }
  const { run_url: link, workflow } = parsed.data;
  await staffAlert({
    key: `workflow:${link}`,
    link,
    team: "web",
    text_ar: WHAT[workflow].ar,
    text_en: WHAT[workflow].en,
    urgent: true,
  });
  return NextResponse.json({ ok: true });
};
