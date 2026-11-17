"use client";

import type { Locale } from "@repo/internationalization";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { sanitizeRichText } from "@/lib/data/sanitize";
import { SectionSpinner } from "../states";
import { AdminHeading, ErrorLine } from "./kit";

interface Manual {
  body_ar: string | null;
  body_en: string | null;
  code: string;
  slug: string;
  title_ar: string;
  title_en: string;
}

/**
 * The seat's manual for one of the holder's roles (decisions.md, Members:
 * "A new role holder"), read in the Diwan. Opening it is the checklist's
 * step: the page records it as it loads (core.open_role_manual), so no
 * click or navigation can drop it.
 */
export const RoleManual = ({ assignmentId }: { assignmentId: string }) => {
  const t = useTranslations("diwan.admin.manual");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const manual = useQuery({
    queryFn: async () =>
      ((unwrap(
        await supabase
          .schema("api")
          .rpc("open_role_manual", { assignment_id: assignmentId })
      ) ?? [])[0] ?? null) as Manual | null,
    queryKey: ["admin", "role-manual", assignmentId],
    staleTime: Number.POSITIVE_INFINITY,
  });
  if (manual.isPending) {
    return <SectionSpinner />;
  }
  if (!manual.data) {
    return (
      <div className="grid gap-4">
        <AdminHeading title={t("title")} />
        <p className="type-body">{t("notYet")}</p>
        <ErrorLine error={manual.error} />
      </div>
    );
  }
  const doc = manual.data;
  const body =
    (locale === "ar" ? doc.body_ar || doc.body_en : doc.body_en) ?? "";
  return (
    <article className="grid max-w-3xl gap-6">
      <AdminHeading
        status={doc.code}
        title={localized({ ...doc }, "title", locale)}
      />
      <div
        className="document-text prose max-w-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized here
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }}
        dir="auto"
      />
    </article>
  );
};
